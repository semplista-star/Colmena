-- MIMPER — Funcions del Workflow 03 (pressupostos intel·ligents)
-- Els preus, descomptes i totals surten NOMÉS de dades verificades a la BD.

create sequence if not exists mimper.seq_esborrany;

-- Context per a la IA: client, catàleg actiu (sense preus) i històric similar
create or replace function mimper.context_pressupost(p_cif text, p_nom text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_client jsonb; v_cid uuid;
begin
  select to_jsonb(c) - 'nom_normalitzat', c.id into v_client, v_cid from mimper.clients c
   where (nullif(p_cif,'') is not null and c.cif = upper(regexp_replace(p_cif, '[^A-Za-z0-9]', '', 'g')))
   limit 1;
  if v_client is null and nullif(trim(p_nom),'') is not null then
    select to_jsonb(c) - 'nom_normalitzat', c.id into v_client, v_cid from mimper.clients c
     where extensions.similarity(c.nom_normalitzat, lower(p_nom)) > 0.45
     order by extensions.similarity(c.nom_normalitzat, lower(p_nom)) desc limit 1;
    if v_client is not null then v_client := v_client || jsonb_build_object('coincidencia', 'per_nom_aproximat'); end if;
  end if;
  return jsonb_build_object(
    'client', v_client,
    'cataleg', coalesce((select jsonb_agg(jsonb_build_object('codi', codi, 'descripcio', descripcio, 'familia', familia, 'unitat', unitat,
                         'contingut_envas', contingut_envas, 'rendiment_kg_m2', rendiment_kg_m2) order by codi)
                         from mimper.productes where actiu), '[]'::jsonb),
    'historic_client', coalesce((select jsonb_agg(h) from (
        select p.numero, p.any_pressupost, p.data_pressupost, p.total,
               (select jsonb_agg(jsonb_build_object('codi', l.codi_text, 'descripcio', l.descripcio, 'quantitat', l.quantitat) order by l.num_linia)
                  from mimper.linies_pressupost l where l.pressupost_id = p.id) as linies
          from mimper.pressupostos p where p.client_id = v_cid and p.qualitat = 'verificat'
         order by p.data_pressupost desc nulls last limit 5) h), '[]'::jsonb));
end $$;

-- Crea l'esborrany amb preus vigents i descompte del client
create or replace function mimper.crear_esborrany_pressupost(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_client mimper.clients%rowtype;
  v_id uuid; v_num text; v_any int := extract(year from current_date)::int;
  v_l jsonb; v_i int := 0; v_prod mimper.productes%rowtype; v_preu numeric;
  v_q numeric; v_dte numeric; v_imp numeric;
  v_sub numeric := 0; v_pes numeric := 0; v_m3 numeric := 0; v_adr boolean := false;
  v_motius text[] := '{}'; v_linies jsonb := '[]';
begin
  if nullif(p->>'client_id','') is not null then
    select * into v_client from mimper.clients where id = (p->>'client_id')::uuid;
  end if;
  if v_client.id is null then v_motius := v_motius || 'client no identificat a la base de dades'::text; end if;
  v_dte := coalesce(v_client.descompte_habitual, 0);
  if v_client.id is not null and v_client.descompte_habitual is null then
    v_motius := v_motius || 'descompte habitual del client desconegut (s''aplica 0 %)'::text;
  end if;

  v_num := 'ESB-' || v_any || '-' || lpad(nextval('mimper.seq_esborrany')::text, 4, '0');
  insert into mimper.pressupostos (numero, any_pressupost, data_pressupost, valid_fins, client_id, client_text, estat, origen, iva_pct, qualitat, observacions)
  values (v_num, v_any, current_date, current_date + 30, v_client.id, coalesce(v_client.rao_social, p->>'client_text'), 'esborrany', 'generat', 21, 'estimat', p->>'peticio')
  returning id into v_id;

  for v_l in select * from jsonb_array_elements(coalesce(p->'linies','[]'::jsonb)) loop
    v_i := v_i + 1;
    v_q := mimper.num(v_l->'quantitat');
    select * into v_prod from mimper.productes where codi = v_l->>'codi' and actiu;
    v_preu := null;
    if v_prod.id is not null then
      select preu into v_preu from mimper.preus_producte
       where producte_id = v_prod.id and llista_preus = 'general'
         and current_date >= vigent_des and (vigent_fins is null or current_date <= vigent_fins)
       order by vigent_des desc limit 1;
    end if;
    if v_prod.id is null then v_motius := v_motius || ('línia '||v_i||': producte '||coalesce(v_l->>'codi','?')||' no existeix al catàleg');
    elsif v_preu is null then v_motius := v_motius || ('línia '||v_i||': '||v_prod.codi||' sense preu vigent');
    end if;
    if v_q is null or v_q <= 0 then v_motius := v_motius || ('línia '||v_i||': quantitat no vàlida'); end if;
    v_imp := case when v_preu is not null and v_q is not null then round(v_q * v_preu * (1 - v_dte/100), 2) end;
    insert into mimper.linies_pressupost (pressupost_id, num_linia, producte_id, codi_text, descripcio, quantitat, unitat, preu_unitari, descompte_pct, import_linia, import_quadra)
    values (v_id, v_i, v_prod.id, v_l->>'codi', coalesce(v_prod.descripcio, v_l->>'descripcio'), v_q, v_prod.unitat, v_preu, v_dte, v_imp, v_imp is not null);
    v_sub := v_sub + coalesce(v_imp, 0);
    if v_prod.id is not null then
      if v_prod.pes_envas_kg is null or v_prod.volum_envas_m3 is null then
        v_motius := v_motius || ('línia '||v_i||': '||v_prod.codi||' sense pes o volum per envàs (transport incomplet)');
      end if;
      v_pes := v_pes + coalesce(v_q * v_prod.pes_envas_kg, 0);
      v_m3 := v_m3 + coalesce(v_q * v_prod.volum_envas_m3, 0);
      v_adr := v_adr or coalesce(v_prod.es_adr, false);
    end if;
    v_linies := v_linies || jsonb_build_object('num', v_i, 'codi', v_l->>'codi', 'descripcio', coalesce(v_prod.descripcio, v_l->>'descripcio'),
                  'quantitat', v_q, 'preu', v_preu, 'dte', v_dte, 'import', v_imp);
  end loop;
  if v_i = 0 then v_motius := v_motius || 'la petició no té cap línia de producte identificada'::text; end if;

  update mimper.pressupostos set subtotal = v_sub where id = v_id;
  insert into mimper.registre_auditoria (actor, workflow, entitat, entitat_id, accio, despres)
  values (coalesce(p->>'comercial','MIMPER - 03'), 'MIMPER - 03', 'pressupost', v_id::text, 'crear_esborrany', jsonb_build_object('numero', v_num, 'motius', v_motius));

  return jsonb_build_object('pressupost_id', v_id, 'numero', v_num, 'subtotal', v_sub, 'pes_kg', round(v_pes,2), 'm3', round(v_m3,4),
    'es_adr', v_adr, 'linies', v_linies, 'motius', v_motius, 'client', v_client.rao_social, 'complet', cardinality(v_motius) = 0);
end $$;

-- Aplica el transport calculat i tanca els totals; passa a 'revisio'
create or replace function mimper.aplicar_transport_pressupost(p_pressupost_id uuid, p_calcul jsonb, p_transport_inclos boolean default false)
returns jsonb
language plpgsql set search_path = '' as $$
declare v_p mimper.pressupostos%rowtype; v_transp numeric; v_base numeric; v_iva numeric;
begin
  select * into v_p from mimper.pressupostos where id = p_pressupost_id;
  v_transp := case when p_calcul->>'estat' = 'calculat' and not p_transport_inclos then (p_calcul->>'total_sense_iva')::numeric
                   when p_transport_inclos then 0 end;
  v_base := coalesce(v_p.subtotal, 0) + coalesce(v_transp, 0);
  v_iva := round(v_base * coalesce(v_p.iva_pct, 21) / 100, 2);
  update mimper.pressupostos set transport_import = v_transp, transport_inclos = p_transport_inclos,
         base_imposable = v_base, iva_import = v_iva, total = v_base + v_iva, estat = 'revisio',
         totals_quadren = true
   where id = p_pressupost_id;
  return jsonb_build_object('pressupost_id', p_pressupost_id, 'numero', v_p.numero, 'subtotal', v_p.subtotal,
    'transport', v_transp, 'transport_estat', p_calcul->>'estat', 'transport_motius', p_calcul->'motius',
    'base', v_base, 'iva', v_iva, 'total', v_base + v_iva);
end $$;

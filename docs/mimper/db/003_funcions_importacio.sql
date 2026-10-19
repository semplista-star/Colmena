-- MIMPER — Funcions d'importació documental (Workflow 01)
-- Tota la validació i escriptura es fa aquí, de forma determinista.
-- La IA només aporta l'objecte JSON interpretat; aquí es comprova i es desa.

-- 1) Registrar un arxiu detectat a OneDrive/SharePoint (evita duplicats)
--    Retorna si cal processar-lo: nou, modificat (etag diferent) o fallat amb menys de 3 intents.
create or replace function mimper.registrar_document(
  p_origen text, p_drive_id text, p_item_id text, p_ruta text, p_nom text,
  p_mime text, p_mida bigint, p_etag text, p_modificat timestamptz
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_doc mimper.documents%rowtype;
  v_ext text := lower(nullif(substring(p_nom from '\.([^.]+)$'), ''));
  v_any int := nullif(substring(coalesce(p_ruta,'') || '/' || p_nom from '(20[0-9]{2})'), '')::int;
  v_cal boolean;
begin
  insert into mimper.documents (origen, drive_id, item_id, ruta, nom_arxiu, extensio, mime_type, mida_bytes, etag, modificat_origen, any_document)
  values (p_origen::mimper.sistema_extern, p_drive_id, p_item_id, coalesce(p_ruta,'/'), p_nom, v_ext, p_mime, p_mida, p_etag, p_modificat, v_any)
  on conflict (origen, item_id) do update set
    ruta = excluded.ruta, nom_arxiu = excluded.nom_arxiu, mida_bytes = excluded.mida_bytes,
    modificat_origen = excluded.modificat_origen,
    estat = case when mimper.documents.etag is distinct from excluded.etag then 'detectat'::mimper.estat_document else mimper.documents.estat end,
    intents = case when mimper.documents.etag is distinct from excluded.etag then 0 else mimper.documents.intents end,
    etag = excluded.etag
  returning * into v_doc;

  v_cal := v_doc.estat = 'detectat' or (v_doc.estat = 'error' and v_doc.intents < 3);
  return jsonb_build_object('document_id', v_doc.id, 'estat', v_doc.estat, 'intents', v_doc.intents,
                            'cal_processar', v_cal, 'extensio', v_ext, 'any', v_any);
end $$;

-- 2) Marcar inici de processament (compta intents)
create or replace function mimper.iniciar_processament(p_document_id uuid) returns void
language sql set search_path = '' as $$
  update mimper.documents set estat = 'processant', intents = intents + 1 where id = p_document_id;
$$;

-- 3) Registrar un error d'importació
create or replace function mimper.registrar_error(
  p_document_id uuid, p_workflow text, p_fase text, p_missatge text, p_detall jsonb default null
) returns void
language plpgsql set search_path = '' as $$
begin
  if p_document_id is not null then
    update mimper.documents set estat = 'error' where id = p_document_id;
  end if;
  insert into mimper.incidencies_importacio (document_id, workflow, fase, gravetat, missatge, detall)
  values (p_document_id, p_workflow, p_fase, 'error', left(coalesce(p_missatge,'error desconegut'), 2000), p_detall);
end $$;

-- Helpers numèrics: accepta 1.234,56 / 1234.56 / "12,5 %" / null
create or replace function mimper.num(p jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
declare t text;
begin
  if p is null or jsonb_typeof(p) = 'null' then return null; end if;
  if jsonb_typeof(p) = 'number' then return (p #>> '{}')::numeric; end if;
  t := regexp_replace(p #>> '{}', '[^0-9,.\-]', '', 'g');
  if t = '' then return null; end if;
  if t ~ ',\d{1,2}$' then t := replace(replace(t, '.', ''), ',', '.'); else t := replace(t, ',', ''); end if;
  return t::numeric;
exception when others then return null;
end $$;

create or replace function mimper.data_iso(p text) returns date
language plpgsql immutable set search_path = '' as $$
begin
  if p is null or p = '' then return null; end if;
  if p ~ '^\d{4}-\d{2}-\d{2}' then return left(p,10)::date; end if;
  if p ~ '^\d{1,2}/\d{1,2}/\d{4}$' then return to_date(p, 'DD/MM/YYYY'); end if;
  return null;
exception when others then return null;
end $$;

-- 4) Desar el resultat de l'extracció (IA) amb validacions
create or replace function mimper.desar_document_extret(
  p_document_id uuid, p_text text, p_dades jsonb, p_model text
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_tipus text := coalesce(p_dades->>'tipus_document', 'altre');
  v_conf numeric := coalesce(mimper.num(p_dades->'confianca'), 0);
  p jsonb := p_dades->'pressupost';
  v_avisos text[] := '{}';
  v_numero text; v_data date; v_any int;
  v_cif text; v_client uuid; v_press uuid;
  v_l jsonb; v_i int := 0;
  v_q numeric; v_pu numeric; v_d numeric; v_imp numeric; v_calc numeric;
  v_suma numeric := 0; v_linies_ok boolean := true;
  v_sub numeric; v_base numeric; v_ivap numeric; v_ivai numeric; v_total numeric; v_transp numeric; v_dte numeric;
  v_quadren boolean; v_qualitat mimper.qualitat_dada; v_estat mimper.estat_document;
begin
  update mimper.documents set text_extret = left(p_text, 200000), dades_extretes = p_dades,
         model_ia = p_model, tipus_document = v_tipus, processat_at = now()
   where id = p_document_id;

  if v_tipus <> 'pressupost' or p is null or jsonb_typeof(p) <> 'object' then
    update mimper.documents set estat = 'processat' where id = p_document_id;
    return jsonb_build_object('document_id', p_document_id, 'tipus', v_tipus, 'resultat', 'classificat');
  end if;

  v_numero := nullif(trim(p->>'numero'), '');
  v_data := mimper.data_iso(p->>'data');
  v_any := coalesce(extract(year from v_data)::int, (select any_document from mimper.documents where id = p_document_id));
  if v_numero is null or v_any is null then
    update mimper.documents set estat = 'pendent_revisio' where id = p_document_id;
    insert into mimper.incidencies_importacio (document_id, workflow, fase, gravetat, missatge, detall)
    values (p_document_id, 'MIMPER - 01', 'validacio', 'avis', 'Pressupost sense número o sense any identificable', jsonb_build_object('numero', v_numero, 'data', p->>'data'));
    return jsonb_build_object('document_id', p_document_id, 'resultat', 'pendent_revisio', 'motiu', 'falta numero o any');
  end if;

  -- Client: només es vincula/crea per CIF (evita duplicats per nom)
  v_cif := nullif(upper(regexp_replace(coalesce(p#>>'{client,cif}',''), '[^A-Za-z0-9]', '', 'g')), '');
  if v_cif is not null then
    select id into v_client from mimper.clients where cif = v_cif;
    if v_client is null and nullif(trim(p#>>'{client,rao_social}'),'') is not null then
      insert into mimper.clients (cif, rao_social, email, telefon, adreca, codi_postal, poblacio, qualitat)
      values (v_cif, trim(p#>>'{client,rao_social}'), p#>>'{client,email}', p#>>'{client,telefon}',
              p#>>'{client,adreca}', p#>>'{client,codi_postal}', p#>>'{client,poblacio}', 'incomplet')
      on conflict do nothing returning id into v_client;
      if v_client is null then select id into v_client from mimper.clients where cif = v_cif; end if;
      insert into mimper.registre_auditoria (actor, workflow, entitat, entitat_id, accio, despres)
      values ('MIMPER - 01', 'MIMPER - 01', 'client', v_client::text, 'crear_des_de_document', jsonb_build_object('cif', v_cif, 'document_id', p_document_id));
    end if;
  else
    v_avisos := v_avisos || 'client sense CIF: no s''ha vinculat cap client'::text;
  end if;

  v_sub := mimper.num(p->'subtotal'); v_base := mimper.num(p->'base_imposable');
  v_ivap := mimper.num(p->'iva_pct'); v_ivai := mimper.num(p->'iva_import'); v_total := mimper.num(p->'total');
  v_transp := mimper.num(p->'transport_import'); v_dte := mimper.num(p->'descompte_import');

  insert into mimper.pressupostos (numero, any_pressupost, data_pressupost, valid_fins, client_id, client_text, estat, origen,
     subtotal, descompte_import, transport_import, transport_inclos, base_imposable, iva_pct, iva_import, total, document_id, observacions)
  values (v_numero, v_any, v_data, mimper.data_iso(p->>'valid_fins'), v_client, p#>>'{client,rao_social}', 'desconegut', 'historic',
     v_sub, v_dte, v_transp, (p->>'transport_inclos')::boolean, v_base, v_ivap, v_ivai, v_total, p_document_id, p->>'observacions')
  on conflict (numero, any_pressupost) do nothing
  returning id into v_press;

  if v_press is null then
    update mimper.documents set estat = 'processat' where id = p_document_id;
    insert into mimper.incidencies_importacio (document_id, workflow, fase, gravetat, missatge, detall)
    values (p_document_id, 'MIMPER - 01', 'desat', 'avis', 'Pressupost ja existent: no s''ha sobreescrit', jsonb_build_object('numero', v_numero, 'any', v_any));
    return jsonb_build_object('document_id', p_document_id, 'resultat', 'duplicat', 'numero', v_numero, 'any', v_any);
  end if;

  for v_l in select * from jsonb_array_elements(coalesce(p->'linies','[]'::jsonb)) loop
    v_i := v_i + 1;
    v_q := mimper.num(v_l->'quantitat'); v_pu := mimper.num(v_l->'preu_unitari');
    v_d := coalesce(mimper.num(v_l->'descompte_pct'), 0); v_imp := mimper.num(v_l->'import');
    v_calc := case when v_q is not null and v_pu is not null then round(v_q * v_pu * (1 - v_d/100), 2) end;
    if v_imp is null then v_imp := v_calc; end if;
    insert into mimper.linies_pressupost (pressupost_id, num_linia, producte_id, codi_text, descripcio, quantitat, unitat, preu_unitari, descompte_pct, import_linia, import_quadra)
    values (v_press, v_i, (select id from mimper.productes where codi = nullif(trim(v_l->>'codi'),'')),
            nullif(trim(v_l->>'codi'),''), v_l->>'descripcio', v_q, v_l->>'unitat', v_pu, v_d, v_imp,
            case when v_calc is null or v_imp is null then null else abs(v_calc - v_imp) <= 0.02 end);
    if v_calc is not null and v_imp is not null and abs(v_calc - v_imp) > 0.02 then
      v_linies_ok := false; v_avisos := v_avisos || ('línia '||v_i||': quantitat×preu×(1-dte) = '||v_calc||' ≠ '||v_imp);
    end if;
    v_suma := v_suma + coalesce(v_imp, 0);
  end loop;
  if v_i = 0 then v_avisos := v_avisos || 'pressupost sense línies'::text; v_linies_ok := false; end if;

  v_quadren := v_linies_ok
    and (v_sub is null or abs(v_suma - v_sub) <= 0.05)
    and (v_base is null or v_ivap is null or v_ivai is null or abs(round(v_base * v_ivap / 100, 2) - v_ivai) <= 0.05)
    and (v_base is null or v_ivai is null or v_total is null or abs(v_base + v_ivai - v_total) <= 0.05)
    and v_total is not null;
  if v_sub is not null and abs(v_suma - v_sub) > 0.05 then v_avisos := v_avisos || ('suma de línies '||v_suma||' ≠ subtotal '||v_sub); end if;
  if v_base is not null and v_ivai is not null and v_total is not null and abs(v_base + v_ivai - v_total) > 0.05 then
    v_avisos := v_avisos || ('base '||v_base||' + IVA '||v_ivai||' ≠ total '||v_total);
  end if;
  if v_total is null then v_avisos := v_avisos || 'sense total'::text; end if;

  v_qualitat := case when v_quadren and v_conf >= 0.8 and v_client is not null then 'verificat'::mimper.qualitat_dada else 'incomplet'::mimper.qualitat_dada end;
  v_estat := case when v_quadren and v_conf >= 0.8 then 'processat'::mimper.estat_document else 'pendent_revisio'::mimper.estat_document end;

  update mimper.pressupostos set totals_quadren = v_quadren, qualitat = v_qualitat where id = v_press;
  update mimper.documents set estat = v_estat where id = p_document_id;
  if cardinality(v_avisos) > 0 then
    insert into mimper.incidencies_importacio (document_id, workflow, fase, gravetat, missatge, detall)
    values (p_document_id, 'MIMPER - 01', 'validacio', 'avis', array_to_string(v_avisos, ' | '), jsonb_build_object('pressupost_id', v_press, 'confianca', v_conf));
  end if;
  insert into mimper.registre_auditoria (actor, workflow, entitat, entitat_id, accio, despres)
  values ('MIMPER - 01', 'MIMPER - 01', 'pressupost', v_press::text, 'importar_historic',
          jsonb_build_object('numero', v_numero, 'any', v_any, 'total', v_total, 'quadren', v_quadren, 'document_id', p_document_id));

  return jsonb_build_object('document_id', p_document_id, 'resultat', v_estat, 'pressupost_id', v_press,
    'numero', v_numero, 'any', v_any, 'linies', v_i, 'totals_quadren', v_quadren, 'qualitat', v_qualitat, 'avisos', v_avisos);
end $$;

-- 5) Registre d'execucions
create or replace function mimper.obrir_execucio(p_workflow text) returns bigint
language sql set search_path = '' as $$
  insert into mimper.execucions_sincronitzacio (workflow) values (p_workflow) returning id;
$$;
create or replace function mimper.tancar_execucio(p_id bigint, p_estat text, p_comptadors jsonb, p_error text default null) returns void
language sql set search_path = '' as $$
  update mimper.execucions_sincronitzacio set fi = now(), estat = p_estat, comptadors = p_comptadors, error = p_error where id = p_id;
$$;

-- MIMPER — Calculadora de transport Jovitrans (determinista)
-- Retorna jsonb amb estat 'calculat' o 'pendent_revisio' i els motius.
-- No inventa cap valor: si falta zona, tarifa, preu de gasoil o tram de carburant, ho marca.
create or replace function mimper.calcular_transport(
  p_cp text,
  p_kg numeric,
  p_m3 numeric,
  p_es_adr boolean default false,
  p_sentit text default 'sortida',
  p_data date default current_date,
  p_illa text default null,
  p_amb_asseguranca boolean default true,
  p_serveis text[] default '{}'
) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_motius text[] := '{}';
  v_avisos text[] := '{}';
  v_prefix text;
  v_zona int; v_termini text; v_prov text;
  v_factor int;
  v_vol numeric; v_tax numeric; v_tram numeric; v_port numeric;
  v_rec jsonb := '[]'::jsonb;
  v_total numeric;
  v_setmana date; v_paiih numeric; v_pct numeric;
  v_imp numeric;
  r record; s text;
begin
  if p_cp is null or length(trim(p_cp)) < 2 then
    return jsonb_build_object('estat','pendent_revisio','motius',array['falta codi postal']);
  end if;
  if p_kg is null and p_m3 is null then
    return jsonb_build_object('estat','pendent_revisio','motius',array['falten kg i m3']);
  end if;
  v_prefix := upper(left(trim(p_cp),2));

  if v_prefix = '07' then
    if p_illa is null then
      return jsonb_build_object('estat','pendent_revisio','motius',array['CP 07: cal indicar l''illa (Mallorca, Menorca, Ibiza, Formentera)']);
    end if;
    select zona, termini_hores, provincia_illa into v_zona, v_termini, v_prov from mimper.zones_postals
     where prefix_cp = '07' and lower(provincia_illa) = lower(p_illa)
       and p_data between vigent_des and coalesce(vigent_fins, 'infinity') limit 1;
  else
    select zona, termini_hores, provincia_illa into v_zona, v_termini, v_prov from mimper.zones_postals
     where prefix_cp = v_prefix and p_data between vigent_des and coalesce(vigent_fins, 'infinity') limit 1;
  end if;
  if v_zona is null then
    return jsonb_build_object('estat','pendent_revisio','motius',array['no hi ha zona vigent per al CP '||p_cp||' a data '||p_data]);
  end if;
  if v_zona > 13 then
    return jsonb_build_object('estat','pendent_revisio','zona',v_zona,'provincia',v_prov,'motius',array['zona '||v_zona||' ('||v_prov||'): tarifa a consultar']);
  end if;

  v_factor := case when v_zona in (10,11,12,13) or v_prefix in ('51','52') then 333 else 270 end;
  v_vol := round(coalesce(p_m3,0) * v_factor, 2);
  v_tax := greatest(coalesce(p_kg,0), v_vol);

  select kg_fins, preu into v_tram, v_port from mimper.tarifes_transport
   where sentit = p_sentit and zona = v_zona and kg_fins >= v_tax
     and p_data between vigent_des and coalesce(vigent_fins, 'infinity')
   order by kg_fins limit 1;
  if v_port is null then
    return jsonb_build_object('estat','pendent_revisio','zona',v_zona,'pes_taxable',v_tax,
      'motius',array['sense tarifa vigent per a aquest pes/zona/data (més de 5.000 kg = servei DIRECT a cotitzar, o tarifa no carregada)']);
  end if;

  if p_data >= date '2026-07-01' then
    select setmana, pai_mes_ih into v_setmana, v_paiih from mimper.preu_gasoil_setmanal
     where setmana <= p_data order by setmana desc limit 1;
    if v_setmana is null or p_data - v_setmana > 6 then
      v_motius := v_motius || ('falta el preu del gasoil de la setmana del '||p_data);
    else
      select percentatge into v_pct from mimper.taula_carburant
       where v_paiih between pai_ih_des and pai_ih_fins and p_data >= vigent_des
         and (vigent_fins is null or p_data <= vigent_fins)
       order by vigent_des desc limit 1;
      if v_pct is null then
        v_motius := v_motius || ('PAI+IH '||v_paiih||' fora de la taula de carburant');
      else
        v_imp := round(v_port * v_pct / 100, 2);
        v_rec := v_rec || jsonb_build_object('concepte','Carburant','base','port','pct',v_pct,'pai_ih',v_paiih,'setmana',v_setmana,'import',v_imp);
        v_avisos := v_avisos || 'periode de referència del carburant per confirmar amb Jovitrans (setmana de l''enviament)'::text;
      end if;
    end if;
  else
    v_motius := v_motius || 'carburant anterior a l''01/07/2026: sistema antic, el % surt de la factura'::text;
  end if;

  if p_es_adr then
    select * into r from mimper.recarrecs where nom = 'Mercancía ADR' and p_data between vigent_des and coalesce(vigent_fins,'infinity') limit 1;
    v_imp := greatest(round(v_port * r.valor / 100, 2), coalesce(r.minim, 0));
    v_rec := v_rec || jsonb_build_object('concepte','ADR','pct',r.valor,'minim',r.minim,'import',v_imp);
  end if;

  if p_amb_asseguranca then
    select * into r from mimper.recarrecs where nom = 'Seguro Jovi-Trans' and p_data between vigent_des and coalesce(vigent_fins,'infinity') limit 1;
    v_imp := greatest(round(v_port * r.valor / 100, 2), coalesce(r.minim, 0));
    v_rec := v_rec || jsonb_build_object('concepte','Assegurança Jovi-Trans','pct',r.valor,'minim',r.minim,'import',v_imp);
  end if;

  select * into r from mimper.recarrecs where nom = 'Tasa transición energética' and p_data between vigent_des and coalesce(vigent_fins,'infinity') limit 1;
  if found then
    v_rec := v_rec || jsonb_build_object('concepte','Taxa transició energètica','import',r.valor,'confirmat',r.confirmat);
    if not r.confirmat then v_avisos := v_avisos || 'taxa de transició energètica deduïda de factures, pendent de confirmar'::text; end if;
  end if;

  foreach s in array coalesce(p_serveis, '{}') loop
    select * into r from mimper.recarrecs where nom = s and p_data between vigent_des and coalesce(vigent_fins,'infinity') limit 1;
    if not found then
      v_motius := v_motius || ('servei desconegut: '||s);
    elsif r.tipus = 'fijo' then
      v_rec := v_rec || jsonb_build_object('concepte',r.nom,'import',r.valor);
    elsif r.tipus = 'porcentaje_porte' then
      v_rec := v_rec || jsonb_build_object('concepte',r.nom,'pct',r.valor,'import',greatest(round(v_port*r.valor/100,2),coalesce(r.minim,0)));
    elsif r.tipus = 'por_kg_tasable' then
      v_rec := v_rec || jsonb_build_object('concepte',r.nom,'import',greatest(round(v_tax*r.valor,2),coalesce(r.minim,0)));
      v_avisos := v_avisos || ('trams de '||r.nom||' per sobre de 100 kg no carregats')::text;
    else
      v_motius := v_motius || ('servei '||s||' requereix dades addicionals (tipus '||r.tipus||')');
    end if;
  end loop;

  select v_port + coalesce(sum((e->>'import')::numeric),0) into v_total from jsonb_array_elements(v_rec) e;

  return jsonb_build_object(
    'estat', case when cardinality(v_motius) = 0 then 'calculat' else 'pendent_revisio' end,
    'motius', v_motius, 'avisos', v_avisos,
    'cp', p_cp, 'provincia', v_prov, 'zona', v_zona, 'termini_hores', v_termini,
    'factor_volumetric', v_factor, 'pes_volumetric', v_vol, 'pes_taxable', v_tax,
    'tram_kg', v_tram, 'port_base', v_port, 'recarrecs', v_rec,
    'total_sense_iva', round(v_total,2), 'total_amb_iva', round(v_total*1.21,2),
    'versio_calcul', 'jovitrans-2026-v1');
end $$;
grant execute on function mimper.calcular_transport(text,numeric,numeric,boolean,text,date,text,boolean,text[]) to mimper_lectura;

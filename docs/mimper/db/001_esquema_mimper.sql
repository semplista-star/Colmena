-- =====================================================================
-- MIMPER — Base de dades central (PostgreSQL 15+)
-- Esquema: mimper
-- Idempotent: es pot executar més d'un cop sense trencar res.
-- No conté dades ni secrets.
-- =====================================================================

create schema if not exists mimper;
set search_path = mimper, public;

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- cerques aproximades de noms

-- ---------------------------------------------------------------------
-- Tipus controlats
-- ---------------------------------------------------------------------
do $$ begin
  create type qualitat_dada as enum ('verificat', 'estimat', 'incomplet');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estat_document as enum ('detectat', 'processant', 'processat', 'pendent_revisio', 'error', 'ignorat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sistema_extern as enum ('sage200', 'pipedrive', 'onedrive', 'sharepoint', 'outlook', 'jovitrans');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Funció comuna: updated_at automàtic
-- ---------------------------------------------------------------------
create or replace function mimper.tg_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- =====================================================================
-- 1. DOCUMENTS ORIGINALS I INCIDÈNCIES D'IMPORTACIÓ
-- =====================================================================
create table if not exists documents (
  id               uuid primary key default gen_random_uuid(),
  origen           sistema_extern not null,              -- onedrive / sharepoint / outlook
  drive_id         text,
  item_id          text not null,                        -- id de l'arxiu a OneDrive/SharePoint
  ruta             text not null,                        -- ruta completa a l'origen
  nom_arxiu        text not null,
  extensio         text,
  mime_type        text,
  mida_bytes       bigint,
  hash_sha256      text,                                 -- contingut; evita duplicats encara que es renomeni
  etag             text,                                 -- versió a OneDrive; detecta canvis
  modificat_origen timestamptz,
  any_document     int,
  tipus_document   text,                                 -- pressupost, factura_transport, tarifa, fitxa_tecnica, llista_preus, altre
  estat            estat_document not null default 'detectat',
  intents          int not null default 0,
  text_extret      text,
  dades_extretes   jsonb,                                -- resultat brut de l'extracció (IA o parser)
  model_ia         text,
  processat_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (origen, item_id)
);
create unique index if not exists ux_documents_hash on documents (hash_sha256) where hash_sha256 is not null;
create index if not exists ix_documents_estat on documents (estat);
create index if not exists ix_documents_tipus on documents (tipus_document, any_document);
drop trigger if exists t_documents_upd on documents;
create trigger t_documents_upd before update on documents for each row execute function tg_updated_at();

create table if not exists incidencies_importacio (
  id           bigserial primary key,
  document_id  uuid references documents(id) on delete cascade,
  workflow     text not null,
  fase         text not null,                            -- descarrega, extraccio, ia, validacio, desat
  gravetat     text not null check (gravetat in ('info', 'avis', 'error')),
  missatge     text not null,
  detall       jsonb,
  resolta      boolean not null default false,
  resolta_per  text,
  resolta_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists ix_incid_obertes on incidencies_importacio (resolta, gravetat);

-- =====================================================================
-- 2. CLIENTS, PRODUCTES I IDENTIFICADORS EXTERNS
-- =====================================================================
create table if not exists clients (
  id              uuid primary key default gen_random_uuid(),
  cif             text,                                  -- normalitzat: majúscules, sense espais ni guions
  rao_social      text not null,
  nom_normalitzat text generated always as (lower(regexp_replace(rao_social, '[^[:alnum:]]+', ' ', 'g'))) stored,
  tipus_client    text,                                  -- aplicador, botiga, constructora, particular, altre
  email           text,
  telefon         text,
  adreca          text,
  codi_postal     text,
  poblacio        text,
  provincia       text,
  pais            text default 'ES',
  descompte_habitual numeric(5,2),
  qualitat        qualitat_dada not null default 'incomplet',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists ux_clients_cif on clients (cif) where cif is not null;
create index if not exists ix_clients_nom_trgm on clients using gin (nom_normalitzat gin_trgm_ops);
drop trigger if exists t_clients_upd on clients;
create trigger t_clients_upd before update on clients for each row execute function tg_updated_at();

create table if not exists productes (
  id              uuid primary key default gen_random_uuid(),
  codi            text not null unique,                  -- codi d'article (el de Sage quan existeixi)
  descripcio      text not null,
  familia         text,                                  -- membrana, imprimacio, top_coat, malla, dissolvent, accessori
  unitat          text,                                  -- kg, l, ut, m2
  contingut_envas numeric(10,3),                         -- kg o l per envàs
  pes_envas_kg    numeric(10,3),
  volum_envas_m3  numeric(10,5),
  es_adr          boolean,
  rendiment_kg_m2 numeric(8,3),                          -- per capa, segons fitxa tècnica
  actiu           boolean not null default true,
  qualitat        qualitat_dada not null default 'incomplet',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists t_productes_upd on productes;
create trigger t_productes_upd before update on productes for each row execute function tg_updated_at();

create table if not exists preus_producte (
  id            bigserial primary key,
  producte_id   uuid not null references productes(id),
  llista_preus  text not null default 'general',
  preu          numeric(12,4) not null check (preu >= 0),
  vigent_des    date not null,
  vigent_fins   date,
  origen        text not null,                           -- sage200, llista_excel_2026, ...
  document_id   uuid references documents(id),
  unique (producte_id, llista_preus, vigent_des),
  check (vigent_fins is null or vigent_fins >= vigent_des)
);

-- Correspondència d'identificadors: Sage i Pipedrive NO comparteixen ids.
create table if not exists ids_externs (
  id            bigserial primary key,
  entitat       text not null,                           -- client, producte, pressupost, comanda, factura
  entitat_id    uuid not null,
  sistema       sistema_extern not null,
  id_extern     text not null,
  dades         jsonb,
  verificat     boolean not null default false,          -- vinculació confirmada per una persona o per CIF
  created_at    timestamptz not null default now(),
  unique (sistema, entitat, id_extern),
  unique (entitat, entitat_id, sistema)
);

-- Quin sistema és la font oficial de cada camp (regla de conflictes).
create table if not exists font_oficial_camps (
  entitat   text not null,
  camp      text not null,
  sistema   sistema_extern not null,
  notes     text,
  primary key (entitat, camp)
);

-- =====================================================================
-- 3. PRESSUPOSTOS, COMANDES I ENVIAMENTS
-- =====================================================================
create table if not exists pressupostos (
  id                uuid primary key default gen_random_uuid(),
  numero            text not null,
  any_pressupost    int not null,
  data_pressupost   date,
  valid_fins        date,
  client_id         uuid references clients(id),
  client_text       text,                                -- nom tal com apareix al document
  estat             text not null default 'desconegut', -- esborrany, revisio, enviat, acceptat, rebutjat, caducat, desconegut
  origen            text not null,                       -- historic, generat
  subtotal          numeric(14,2),
  descompte_import  numeric(14,2),
  transport_import  numeric(14,2),
  transport_inclos  boolean,
  base_imposable    numeric(14,2),
  iva_pct           numeric(5,2),
  iva_import        numeric(14,2),
  total             numeric(14,2),
  moneda            text not null default 'EUR',
  totals_quadren    boolean,                             -- validació: suma línies = subtotal, base + IVA = total
  qualitat          qualitat_dada not null default 'incomplet',
  document_id       uuid references documents(id),
  observacions      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (numero, any_pressupost)
);
create index if not exists ix_press_client on pressupostos (client_id, data_pressupost);
create index if not exists ix_press_estat on pressupostos (estat);
drop trigger if exists t_press_upd on pressupostos;
create trigger t_press_upd before update on pressupostos for each row execute function tg_updated_at();

create table if not exists linies_pressupost (
  id              bigserial primary key,
  pressupost_id   uuid not null references pressupostos(id) on delete cascade,
  num_linia       int not null,
  producte_id     uuid references productes(id),
  codi_text       text,
  descripcio      text,
  quantitat       numeric(12,3),
  unitat          text,
  preu_unitari    numeric(12,4),
  descompte_pct   numeric(5,2),
  import_linia    numeric(14,2),
  import_quadra   boolean,                               -- quantitat x preu x (1 - dte) = import
  unique (pressupost_id, num_linia)
);

create table if not exists comandes (
  id              uuid primary key default gen_random_uuid(),
  numero          text not null,
  any_comanda     int not null,
  data_comanda    date,
  client_id       uuid references clients(id),
  pressupost_id   uuid references pressupostos(id),
  estat           text,
  total           numeric(14,2),
  qualitat        qualitat_dada not null default 'incomplet',
  created_at      timestamptz not null default now(),
  unique (numero, any_comanda)
);

create table if not exists enviaments (
  id              uuid primary key default gen_random_uuid(),
  comanda_id      uuid references comandes(id),
  pressupost_id   uuid references pressupostos(id),
  albara_ref      text,                                  -- referència d'albarà de Mimper (apareix a les factures Jovitrans)
  transportista   text not null default 'jovitrans',
  sentit          text not null default 'sortida' check (sentit in ('sortida', 'arribada')),
  data_enviament  date,
  cp_desti        text,
  poblacio_desti  text,
  illa            text,                                  -- Mallorca, Menorca, Eivissa, Formentera (CP 07)
  bultos          int,
  kg_reals        numeric(10,2),
  m3              numeric(10,4),
  es_adr          boolean,
  serveis_extra   text[],
  created_at      timestamptz not null default now()
);
create index if not exists ix_env_albara on enviaments (albara_ref);

-- =====================================================================
-- 4. TARIFES DE TRANSPORT (regles deterministes, amb vigència)
-- =====================================================================
create table if not exists tarifes_transport (
  id            bigserial primary key,
  transportista text not null default 'jovitrans',
  sentit        text not null check (sentit in ('sortida', 'arribada')),
  kg_fins       numeric(10,2) not null,
  zona          int not null,
  preu          numeric(10,2) not null check (preu >= 0),
  vigent_des    date not null,
  vigent_fins   date,
  document_id   uuid references documents(id),
  unique (transportista, sentit, kg_fins, zona, vigent_des)
);

create table if not exists zones_postals (
  id              bigserial primary key,
  transportista   text not null default 'jovitrans',
  prefix_cp       text not null,                         -- '08', '07', 'AD', 'GI'
  provincia_illa  text not null,
  zona            int not null,
  termini_hores   text,
  vigent_des      date not null,
  vigent_fins     date,
  unique (transportista, prefix_cp, provincia_illa, vigent_des)
);

create table if not exists recarrecs (
  id              bigserial primary key,
  transportista   text not null default 'jovitrans',
  nom             text not null,
  tipus           text not null,                         -- percentatge_port, fix, per_kg_taxable, percentatge_valor_mercaderia, percentatge_import_cobrat
  valor           numeric(12,4) not null,
  minim           numeric(10,2),
  maxim           numeric(10,2),
  observacions    text,
  confirmat       boolean not null default true,         -- false = deduït de factures, pendent de confirmar
  vigent_des      date not null,
  vigent_fins     date,
  unique (transportista, nom, vigent_des)
);

create table if not exists preu_gasoil_setmanal (
  setmana         date primary key,                      -- dilluns de la setmana (Ministeri de Transports)
  pai             numeric(10,6) not null,
  impost_hidrocarburs numeric(10,6) not null,
  pai_mes_ih      numeric(10,6) not null,
  font            text not null default 'MITMA preciogasoleosemanalweb.xlsx'
);

create table if not exists taula_carburant (
  id              bigserial primary key,
  transportista   text not null default 'jovitrans',
  pai_ih_des      numeric(10,5) not null,
  pai_ih_fins     numeric(10,5) not null,
  percentatge     numeric(6,2) not null,
  vigent_des      date not null,
  vigent_fins     date,
  unique (transportista, pai_ih_des, vigent_des),
  check (pai_ih_fins > pai_ih_des)
);

-- Càlcul estimat (el que hauria de costar segons tarifa)
create table if not exists costos_transport_estimats (
  id              uuid primary key default gen_random_uuid(),
  enviament_id    uuid references enviaments(id),
  pressupost_id   uuid references pressupostos(id),
  entrada         jsonb not null,                        -- dades d'entrada del càlcul
  zona            int,
  pes_volumetric  numeric(10,2),
  pes_taxable     numeric(10,2),
  tram_kg         numeric(10,2),
  port_base       numeric(10,2),
  recarrecs       jsonb,                                 -- desglossament
  total_sense_iva numeric(10,2),
  estat           text not null check (estat in ('calculat', 'pendent_revisio')),
  motius_revisio  text[],
  versio_calcul   text not null,
  created_at      timestamptz not null default now()
);

-- =====================================================================
-- 5. COSTOS REALS DE TRANSPORT (factures del transportista)
-- =====================================================================
create table if not exists factures_transport (
  id              uuid primary key default gen_random_uuid(),
  transportista   text not null default 'jovitrans',
  numero_factura  text not null,
  data_factura    date,
  es_rectificativa boolean not null default false,
  total_ports     numeric(12,2),
  total_carburant numeric(12,2),
  total_adr       numeric(12,2),
  altres_conceptes jsonb,                                -- taxa transició energètica, bunker, mobility package...
  document_id     uuid references documents(id),
  created_at      timestamptz not null default now(),
  unique (transportista, numero_factura)
);

create table if not exists linies_factura_transport (
  id              bigserial primary key,
  factura_id      uuid not null references factures_transport(id) on delete cascade,
  num_linia       int not null,
  num_expedicio   text not null,
  data_expedicio  date,
  referencia      text,                                  -- normalment l'albarà de Mimper
  sentit          text,                                  -- D / R
  destinatari     text,
  cp              text,
  poblacio        text,
  bultos          int,
  kg              numeric(10,2),
  m3              numeric(10,4),
  port            numeric(10,2),
  recarrecs_linia numeric(10,2),
  enviament_id    uuid references enviaments(id),
  unique (factura_id, num_linia)
);
create index if not exists ix_lft_expedicio on linies_factura_transport (num_expedicio);
create index if not exists ix_lft_ref on linies_factura_transport (referencia);

create table if not exists auditoria_transport (
  id                   bigserial primary key,
  linia_factura_id     bigint not null references linies_factura_transport(id) on delete cascade,
  cost_estimat_id      uuid references costos_transport_estimats(id),
  import_facturat      numeric(10,2) not null,
  import_estimat       numeric(10,2),
  diferencia           numeric(10,2),
  semafor              text not null check (semafor in ('verd', 'ambre', 'vermell')),
  motiu                text,
  created_at           timestamptz not null default now(),
  unique (linia_factura_id)
);

-- =====================================================================
-- 6. SINCRONITZACIONS, AUDITORIA I USUARIS (JARVIS)
-- =====================================================================
create table if not exists execucions_sincronitzacio (
  id            bigserial primary key,
  workflow      text not null,
  inici         timestamptz not null default now(),
  fi            timestamptz,
  estat         text not null default 'en_curs' check (estat in ('en_curs', 'ok', 'amb_avisos', 'error')),
  comptadors    jsonb,                                   -- {llegits, nous, actualitzats, omesos, errors}
  error         text
);

create table if not exists registre_auditoria (
  id            bigserial primary key,
  ts            timestamptz not null default now(),
  actor         text not null,                           -- usuari o workflow
  workflow      text,
  entitat       text not null,
  entitat_id    text,
  accio         text not null,                           -- crear, actualitzar, vincular, aprovar, enviar...
  abans         jsonb,
  despres       jsonb
);
create index if not exists ix_audit_entitat on registre_auditoria (entitat, entitat_id);

create table if not exists usuaris (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  nom           text not null,
  rol           text not null check (rol in ('direccio', 'comercial', 'administracio', 'marqueting', 'admin')),
  pipedrive_user_id text,
  actiu         boolean not null default true
);

-- =====================================================================
-- 7. ROL DE NOMÉS LECTURA PER A JARVIS (permisos mínims)
--    La contrasenya NO es posa aquí: es crea a part i es guarda a les credencials d'n8n.
-- =====================================================================
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'mimper_lectura') then
    create role mimper_lectura nologin;
  end if;
end $$;
grant usage on schema mimper to mimper_lectura;
grant select on all tables in schema mimper to mimper_lectura;
alter default privileges in schema mimper grant select on tables to mimper_lectura;

-- Regles inicials de font oficial (ajustables quan tinguem accés a Sage)
insert into font_oficial_camps (entitat, camp, sistema, notes) values
  ('client',     'cif',               'sage200',   'Dades fiscals: mana Sage'),
  ('client',     'rao_social',        'sage200',   null),
  ('client',     'adreca_fiscal',     'sage200',   null),
  ('client',     'descompte',         'sage200',   'Condicions comercials a Sage'),
  ('client',     'contacte_comercial','pipedrive', 'Persones de contacte i activitat comercial'),
  ('producte',   'preu',              'sage200',   'Mai des de Pipedrive ni de la IA'),
  ('producte',   'estoc',             'sage200',   null),
  ('pressupost', 'estat_comercial',   'pipedrive', 'Etapa del deal'),
  ('comanda',    'tot',               'sage200',   null),
  ('factura',    'tot',               'sage200',   null)
on conflict (entitat, camp) do nothing;

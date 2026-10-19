# Base de dades MIMPER (Supabase · projecte `mimper` · eu-central-1)

Ordre d'aplicació:
1. `001_esquema_mimper.sql`: esquema `mimper` (23 taules). A Supabase s'ha aplicat en 5 migracions (001a–001e) per evitar temps límit; el contingut és equivalent. `pg_trgm` viu a l'esquema `extensions`.
2. `002_calcular_transport.sql`: funció determinista `mimper.calcular_transport(...)`.
3. Dades de referència (tarifa Jovitrans 2026, zones, recàrrecs, taula de carburant, preu setmanal del gasoil): carregades des dels CSV de `scratchpad/base44_csv` (no es versionen aquí perquè són condicions comercials del client).

Proves de la calculadora (port base, sortida, factures reals de juliol de 2026):

| CP | kg | m³ | Pes taxable | Tram | Port | Factura |
|---|---|---|---|---|---|---|
| 08006 | 52 | 0,224 | 60,48 | 70 | 13,81 | 13,81 ✅ |
| 08020 | 401 | 1,193 | 401 | 450 | 44,33 | 44,33 ✅ |
| 08440 | 186 | 1,090 | 294,30 | 300 | 31,65 | 31,65 ✅ |
| 07800 (Eivissa) | 138 | 0,812 | 270,40 (×333) | 300 | 103,65 | 103,65 ✅ |

## Funcions d'importació (`003_funcions_importacio.sql`)

- `registrar_document(...)`: registra un arxiu d'OneDrive i decideix si cal processar-lo (nou, modificat per etag, o fallat amb menys de 3 intents).
- `iniciar_processament(id)`, `registrar_error(...)`, `obrir_execucio(...)`, `tancar_execucio(...)`.
- `desar_document_extret(document_id, text, dades_ia, model)`: valida i desa el pressupost interpretat per la IA:
  - quantitat × preu × (1 − dte) = import de cada línia (±0,02 €); suma de línies = subtotal; base × IVA% = IVA; base + IVA = total (±0,05 €);
  - el client només es vincula o es crea per **CIF** (mai per nom, per no duplicar);
  - un pressupost amb el mateix número i any **no se sobreescriu** (incidència "duplicat");
  - qualitat `verificat` només si tot quadra, confiança de la IA ≥ 0,8 i hi ha client; si no, `pendent_revisio`.

Provat en local: pressupost correcte → `verificat`; línia que no quadra i sense CIF → `pendent_revisio` amb incidència; mateix arxiu sense canvis → no es reprocessa; arxiu modificat → es reprocessa.

## Usuari de base de dades per a n8n

Rol `n8n_mimper` (LOGIN, sense contrasenya fins que la posi l'administrador): pot llegir, inserir i actualitzar a l'esquema `mimper` i executar-ne les funcions. **No pot esborrar.**

## Migracions aplicades a Supabase (projecte `mimper`, ref `easdizdduysporxewsrp`)

| Migració | Contingut |
|---|---|
| 001a–001e | Esquema `mimper` (23 taules), tipus, rols `mimper_lectura` i `n8n_mimper` |
| 002 | `calcular_transport` |
| 003a–003b | Funcions d'importació documental (WF01) |
| 004 | `estimar_transport`, `carregar_gasoil` (WF02) |
| 005 | `context_pressupost`, `crear_esborrany_pressupost`, `aplicar_transport_pressupost` (WF03) |
| 006 | `sync_organitzacions_pipedrive`, `sync_deals_pipedrive` (WF04) |
| 007 | Taula `seguiments`, `pressupostos_per_seguir`, `registrar_seguiment` (WF05) |
| 008 | `auditar_linia_transport`, `importar_factura_transport` (WF06) |
| 009 | `informe_setmanal` (WF07) |
| 010 | `permisos_jarvis`, `jarvis_consulta` (JARVIS, només lectura) |

El text exacte de cada migració és a `supabase_migrations.schema_migrations` (columna `statements`) i es pot exportar amb `supabase db dump --schema mimper`.

## Proves fetes

- Calculadora: 4/4 ports base iguals a factura (inclou Eivissa ×333).
- Auditoria de factures: **40/40 línies reals de juliol 2026 en verd** (inclou una devolució i dues línies d'Eivissa).
- Lector de factures (regex): 3.609 de 3.624 línies reconegudes a 47 PDFs (99,6 %); les 15 restants són internacionals sense preu.
- Pressupost: 4 × 152,40 € amb 10 % dte = 548,64 €; + transport 30,21 € → base 578,85 €, IVA 121,56 €, total 700,41 €.

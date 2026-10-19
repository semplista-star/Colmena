import { workflow, node, trigger, sticky, newCredential, expr } from '@n8n/workflow-sdk';

const formulari = trigger({
  type: 'n8n-nodes-base.formTrigger', version: 2.6,
  config: {
    name: 'Nova sol·licitud de pressupost',
    parameters: {
      authentication: 'n8nUserAuth',
      formTitle: 'MIMPER · Nova sol·licitud de pressupost',
      formDescription: 'Enganxa la petició del client tal com ha arribat. La IA la interpreta; els preus, descomptes, transport i totals surten de la base de dades. Es genera un ESBORRANY per revisar: no s\'envia res al client.',
      responseMode: 'lastNode',
      formFields: { values: [
        { fieldLabel: 'CIF del client', fieldName: 'cif', fieldType: 'text', placeholder: 'B12345678' },
        { fieldLabel: 'Nom del client', fieldName: 'client_nom', fieldType: 'text', requiredField: true },
        { fieldLabel: 'Petició (text del correu, WhatsApp, mesures…)', fieldName: 'peticio', fieldType: 'textarea', requiredField: true },
        { fieldLabel: 'CP d\'entrega', fieldName: 'cp', fieldType: 'text', requiredField: true },
        { fieldLabel: 'Illa (només CP 07)', fieldName: 'illa', fieldType: 'dropdown', fieldOptions: { values: [{ option: '-' }, { option: 'Mallorca' }, { option: 'Menorca' }, { option: 'Ibiza' }, { option: 'Formentera' }] } },
        { fieldLabel: 'Data prevista d\'enviament', fieldName: 'data', fieldType: 'date' },
        { fieldLabel: 'Transport inclòs (no es cobra al client)', fieldName: 'transport_inclos', fieldType: 'radio', fieldOptions: { values: [{ option: 'No' }, { option: 'Sí' }] }, defaultValue: 'No' },
        { fieldLabel: 'Correu de qui ha de revisar-lo', fieldName: 'revisor', fieldType: 'email', requiredField: true }
      ] },
      options: { buttonLabel: 'Preparar esborrany', appendAttribution: false }
    }
  },
  output: [{ cif: 'B12345678', client_nom: 'Pintures Exemple SL', peticio: '4 bidons Mariseal 250', cp: '08006', illa: '-', data: '2026-10-20', transport_inclos: 'No', revisor: 'comercial@mimper.es' }]
});

const context = node({
  type: 'n8n-nodes-base.postgres', version: 2.7,
  config: { name: 'Context: client, catàleg i històric',
    parameters: { operation: 'executeQuery', query: 'select mimper.context_pressupost($1, $2) as ctx', options: { queryReplacement: expr('{{ [$json.cif ?? "", $json.client_nom ?? ""] }}') } },
    credentials: { postgres: newCredential('MIMPER Postgres') } },
  output: [{ ctx: { client: { id: 'c1', rao_social: 'Pintures Exemple SL' }, cataleg: [{ codi: 'MS250', descripcio: 'Mariseal 250' }], historic_client: [] } }]
});

const interpretar = node({
  type: '@n8n/n8n-nodes-langchain.anthropic', version: 1,
  config: {
    name: 'Interpretar petició (Claude)',
    parameters: {
      resource: 'text', operation: 'message',
      modelId: { __rl: true, mode: 'id', value: 'claude-sonnet-5-5' },
      messages: { values: [{ role: 'user', content: expr("PETICIÓ DEL CLIENT:\n\"\"\"\n{{ $('Nova sol·licitud de pressupost').item.json.peticio }}\n\"\"\"\n\nCATÀLEG (només pots fer servir aquests codis):\n{{ JSON.stringify($json.ctx.cataleg ?? (typeof $json.ctx === 'string' ? JSON.parse($json.ctx).cataleg : [])) }}\n\nHISTÒRIC RECENT DEL CLIENT (referència de productes habituals):\n{{ JSON.stringify($json.ctx.historic_client ?? []) }}") }] },
      options: {
        maxTokens: 3000, temperature: 0,
        system: 'Ets l\'assistent de pressupostos de MIMPER. Converteix la petició en línies de producte del catàleg.' + '\n' +
          'Respon NOMÉS amb JSON: {"linies":[{"codi":"","quantitat":0,"justificacio":""}],"dubtes":[],"resum_peticio":""}.' + '\n' +
          'Regles: fes servir EXCLUSIVAMENT codis del catàleg. Quantitat = nombre d\'envasos/unitats de venda.' + '\n' +
          'Si la petició dona m² i el producte té rendiment_kg_m2 i contingut_envas, calcula envasos = ceil(m² × rendiment ÷ contingut) i explica-ho a justificacio; si falten dades, no inventis: afegeix un dubte.' + '\n' +
          'MAI no posis preus ni descomptes. Si no pots identificar un producte, no l\'afegeixis i explica-ho a dubtes.'
      }
    }
  },
  output: [{ content: [{ type: 'text', text: '{"linies":[{"codi":"MS250","quantitat":4,"justificacio":"4 bidons"}],"dubtes":[],"resum_peticio":"4 bidons"}' }] }]
});

const preparar = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Preparar dades de l\'esborrany',
    parameters: { mode: 'runOnceForEachItem', language: 'javaScript',
      jsCode: "let raw = $json.content?.[0]?.text ?? $json.text ?? '';" + '\n' +
        "raw = String(raw).replace(/^```(?:json)?\\s*/i, '').replace(/```\\s*$/, '').trim();" + '\n' +
        "const ia = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));" + '\n' +
        "let ctx = $('Context: client, catàleg i històric').item.json.ctx; if (typeof ctx === 'string') ctx = JSON.parse(ctx);" + '\n' +
        "const f = $('Nova sol·licitud de pressupost').item.json;" + '\n' +
        "return { json: { esborrany: JSON.stringify({ client_id: ctx.client?.id ?? null, client_text: f.client_nom, peticio: f.peticio, comercial: f.revisor, linies: (ia.linies || []).map(l => ({ codi: l.codi, quantitat: l.quantitat })) }), dubtes: ia.dubtes || [], justificacions: (ia.linies || []).map(l => l.codi + ': ' + (l.justificacio || '')), coincidencia_client: ctx.client?.coincidencia ?? (ctx.client ? 'per_cif' : 'no_trobat') } };" }
  },
  output: [{ esborrany: '{}', dubtes: [], justificacions: [], coincidencia_client: 'per_cif' }]
});

const crear = node({
  type: 'n8n-nodes-base.postgres', version: 2.7,
  config: { name: 'Crear esborrany (preus de la BD)',
    parameters: { operation: 'executeQuery', query: 'select mimper.crear_esborrany_pressupost($1::jsonb) as e', options: { queryReplacement: expr('{{ [$json.esborrany] }}') } },
    credentials: { postgres: newCredential('MIMPER Postgres') } },
  output: [{ e: { pressupost_id: 'p1', numero: 'ESB-2026-0001', subtotal: 548.64, pes_kg: 104, m3: 0.12, es_adr: true, motius: [], linies: [] } }]
});

const transport = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.4,
  config: { name: 'Calcular transport (workflow 02)',
    parameters: {
      mode: 'each', source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'BrH44cagzsSqzNBU', cachedResultName: 'MIMPER - 02 - Calculadora transport' },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          cp: expr("{{ $('Nova sol·licitud de pressupost').item.json.cp }}"),
          kg: expr('{{ (typeof $json.e === "string" ? JSON.parse($json.e) : $json.e).pes_kg }}'),
          m3: expr('{{ (typeof $json.e === "string" ? JSON.parse($json.e) : $json.e).m3 }}'),
          es_adr: expr('{{ (typeof $json.e === "string" ? JSON.parse($json.e) : $json.e).es_adr }}'),
          sentit: 'sortida',
          data: expr("{{ $('Nova sol·licitud de pressupost').item.json.data || $today.toISODate() }}"),
          illa: expr("{{ $('Nova sol·licitud de pressupost').item.json.illa === '-' ? '' : $('Nova sol·licitud de pressupost').item.json.illa }}"),
          serveis: expr('{{ [] }}'),
          pressupost_id: expr('{{ (typeof $json.e === "string" ? JSON.parse($json.e) : $json.e).pressupost_id }}'),
          enviament_id: ''
        },
        matchingColumns: [],
        schema: [
          { id: 'cp', displayName: 'cp', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
          { id: 'kg', displayName: 'kg', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'number' },
          { id: 'm3', displayName: 'm3', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'number' },
          { id: 'es_adr', displayName: 'es_adr', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'boolean' },
          { id: 'sentit', displayName: 'sentit', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
          { id: 'data', displayName: 'data', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
          { id: 'illa', displayName: 'illa', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
          { id: 'serveis', displayName: 'serveis', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'array' },
          { id: 'pressupost_id', displayName: 'pressupost_id', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
          { id: 'enviament_id', displayName: 'enviament_id', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' }
        ],
        attemptToConvertTypes: false
      },
      options: { waitForSubWorkflow: true }
    } },
  output: [{ calcul: { estat: 'calculat', total_sense_iva: 30.21 } }]
});

const aplicar = node({
  type: 'n8n-nodes-base.postgres', version: 2.7,
  config: { name: 'Aplicar transport i totals',
    parameters: { operation: 'executeQuery', query: 'select mimper.aplicar_transport_pressupost($1::uuid, $2::jsonb, $3::boolean) as t',
      options: { queryReplacement: expr("{{ [(typeof $('Crear esborrany (preus de la BD)').item.json.e === 'string' ? JSON.parse($('Crear esborrany (preus de la BD)').item.json.e) : $('Crear esborrany (preus de la BD)').item.json.e).pressupost_id, typeof $json.calcul === 'string' ? $json.calcul : JSON.stringify($json.calcul), String($('Nova sol·licitud de pressupost').item.json.transport_inclos === 'Sí')] }}") } },
    credentials: { postgres: newCredential('MIMPER Postgres') } },
  output: [{ t: { numero: 'ESB-2026-0001', subtotal: 548.64, transport: 30.21, base: 578.85, iva: 121.56, total: 700.41 } }]
});

const html = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Muntar resum per a revisió',
    parameters: { mode: 'runOnceForEachItem', language: 'javaScript',
      jsCode: "const P = (x) => typeof x === 'string' ? JSON.parse(x) : x;" + '\n' +
        "const t = P($json.t); const e = P($('Crear esborrany (preus de la BD)').item.json.e); const pr = $('Preparar dades de l\\'esborrany').item.json; const f = $('Nova sol·licitud de pressupost').item.json;" + '\n' +
        "const eur = (n) => n == null ? '<b style=\"color:#b35900\">FALTA</b>' : Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';" + '\n' +
        "const files = (e.linies || []).map(l => '<tr><td>' + (l.codi ?? '') + '</td><td>' + (l.descripcio ?? '') + '</td><td style=\"text-align:right\">' + (l.quantitat ?? '') + '</td><td style=\"text-align:right\">' + eur(l.preu) + '</td><td style=\"text-align:right\">' + (l.dte ?? 0) + ' %</td><td style=\"text-align:right\">' + eur(l.import) + '</td></tr>').join('');" + '\n' +
        "const avisos = [...(e.motius || []), ...((t.transport_estat !== 'calculat') ? (t.transport_motius || ['transport pendent de revisió']) : []), ...(pr.dubtes || []).map(d => 'IA: ' + d)];" + '\n' +
        "if (pr.coincidencia_client === 'per_nom_aproximat') avisos.push('Client identificat per nom aproximat: comprova que és el correcte');" + '\n' +
        "if (pr.coincidencia_client === 'no_trobat') avisos.push('Client no trobat a la base de dades');" + '\n' +
        "const body = '<h2>Esborrany ' + t.numero + ' · ' + (e.client ?? f.client_nom) + '</h2>' +" + '\n' +
        "  '<p><b>Petició:</b> ' + String(f.peticio).replace(/</g, '&lt;') + '</p>' +" + '\n' +
        "  '<table border=\"1\" cellpadding=\"4\" style=\"border-collapse:collapse\"><tr><th>Codi</th><th>Descripció</th><th>Quant.</th><th>Preu</th><th>Dte</th><th>Import</th></tr>' + files + '</table>' +" + '\n' +
        "  '<p>Subtotal: ' + eur(t.subtotal) + '<br>Transport: ' + (f.transport_inclos === 'Sí' ? 'inclòs' : eur(t.transport)) + '<br>Base: ' + eur(t.base) + '<br>IVA 21 %: ' + eur(t.iva) + '<br><b>Total: ' + eur(t.total) + '</b></p>' +" + '\n' +
        "  (avisos.length ? '<p style=\"color:#b35900\"><b>Cal revisar:</b></p><ul>' + avisos.map(a => '<li>' + a + '</li>').join('') + '</ul>' : '<p style=\"color:#1a7f37\">Sense avisos.</p>') +" + '\n' +
        "  '<p><small>Justificació de quantitats (IA): ' + (pr.justificacions || []).join(' · ') + '</small></p><p><small>Preus i descomptes: base de dades MIMPER. Transport: tarifa Jovitrans 2026. Esborrany intern: no s\\'ha enviat res al client.</small></p>';" + '\n' +
        "return { json: { numero: t.numero, revisor: f.revisor, assumpte: 'Revisar esborrany ' + t.numero + ' · ' + (e.client ?? f.client_nom) + (avisos.length ? ' · ' + avisos.length + ' avisos' : ''), html: body } };" }
  },
  output: [{ numero: 'ESB-2026-0001', revisor: 'comercial@mimper.es', assumpte: 'Revisar esborrany', html: '<h2>…</h2>' }]
});

const esborranyCorreu = node({
  type: 'n8n-nodes-base.microsoftOutlook', version: 2,
  config: { name: 'Esborrany Outlook per a revisió interna',
    onError: 'continueRegularOutput',
    parameters: { resource: 'draft', operation: 'create', subject: expr('{{ $json.assumpte }}'), bodyContent: expr('{{ $json.html }}'),
      additionalFields: { toRecipients: expr('{{ $json.revisor }}'), bodyContentType: 'html', importance: 'Normal' } },
    credentials: { microsoftOutlookOAuth2Api: newCredential('MIMPER Outlook') } },
  output: [{ id: 'draft1', webLink: 'https://outlook.office.com/…' }]
});

const mostrar = node({
  type: 'n8n-nodes-base.form', version: 2.5,
  config: { name: 'Mostrar esborrany', parameters: { operation: 'completion', respondWith: 'showText',
    responseText: expr("{{ $('Muntar resum per a revisió').item.json.html }}<p>S'ha creat un <b>esborrany a Outlook</b> per al revisor (no s'ha enviat).</p>") } },
  output: [{}]
});

const nota = sticky('## MIMPER · 03 · Pressupostos intel·ligents\n\n1. La IA només interpreta la petició i tria codis del catàleg.\n2. Preus, descomptes i totals: funcions SQL amb dades verificades.\n3. Transport: crida el workflow 02.\n4. Resultat: esborrany a PostgreSQL (estat `revisio`) + **esborrany** d\'Outlook per al revisor.\n\nNo s\'envia res al client. El registre a Pipedrive/Sage es fa al 04 un cop aprovat.', [], { color: 4 });

export default workflow('mimper-03', 'MIMPER - 03 - Pressupostos intel·ligents')
  .add(formulari)
  .to(context)
  .to(interpretar)
  .to(preparar)
  .to(crear)
  .to(transport)
  .to(aplicar)
  .to(html)
  .to(esborranyCorreu)
  .to(mostrar)
  .add(nota);

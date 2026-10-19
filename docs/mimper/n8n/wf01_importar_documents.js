import { workflow, node, trigger, sticky, newCredential, splitInBatches, nextBatch, merge, placeholder, expr } from '@n8n/workflow-sdk';

const inici = trigger({
  type: 'n8n-nodes-base.manualTrigger', version: 1,
  config: { name: 'Prova manual' },
  output: [{}]
});

const programat = trigger({
  type: 'n8n-nodes-base.scheduleTrigger', version: 1.4,
  config: { name: 'Cada dia 06:30', parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 6, triggerAtMinute: 30 }] } } },
  output: [{}]
});

const configuracio = node({
  type: 'n8n-nodes-base.set', version: 3.5,
  config: {
    name: 'Configuració',
    parameters: {
      mode: 'manual',
      assignments: { assignments: [
        { id: 'c1', name: 'carpeta_id', value: placeholder('ID de la carpeta d\'OneDrive amb els pressupostos (p. ex. PRESSUPOSTOS IA)'), type: 'string' },
        { id: 'c2', name: 'max_documents', value: 10, type: 'number' },
        { id: 'c3', name: 'model_ia', value: 'claude-sonnet-5-5', type: 'string' },
        { id: 'c4', name: 'extensions', value: expr('{{ ["pdf","docx","doc","xlsx","xls","csv"] }}'), type: 'array' }
      ] }
    }
  },
  output: [{ carpeta_id: 'ABC123', max_documents: 10, model_ia: 'claude-sonnet-5-5', extensions: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv'] }]
});

const obrirExecucio = node({
  type: 'n8n-nodes-base.postgres', version: 2.7,
  config: {
    name: 'Obrir registre execució',
    executeOnce: true,
    parameters: { operation: 'executeQuery', query: "select mimper.obrir_execucio('MIMPER - 01 - Importar documents') as execucio_id" },
    credentials: { postgres: newCredential('MIMPER Postgres') }
  },
  output: [{ execucio_id: 1 }]
});

const llistarArrel = node({
  type: 'n8n-nodes-base.microsoftOneDrive', version: 1.1,
  config: {
    name: 'Llistar carpeta',
    executeOnce: true,
    parameters: { resource: 'folder', operation: 'getChildren', folderId: expr("{{ $('Configuració').first().json.carpeta_id }}") },
    credentials: { microsoftOneDriveOAuth2Api: newCredential('MIMPER OneDrive') }
  },
  output: [{ id: 'F1', name: '2025', folder: { childCount: 3 }, parentReference: { driveId: 'D1', path: '/drive/root:/PRESSUPOSTOS IA' } }]
});

const nomesSubcarpetes = node({
  type: 'n8n-nodes-base.filter', version: 2.3,
  config: {
    name: 'Només subcarpetes',
    parameters: { conditions: { combinator: 'and', options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [{ leftValue: expr('{{ $json.folder }}'), rightValue: '', operator: { type: 'object', operation: 'exists', singleValue: true } }] } }
  },
  output: [{ id: 'F1', name: '2025', folder: { childCount: 3 } }]
});

const llistarSubcarpetes = node({
  type: 'n8n-nodes-base.microsoftOneDrive', version: 1.1,
  config: {
    name: 'Llistar subcarpetes (2024, 2025, 2026…)',
    parameters: { resource: 'folder', operation: 'getChildren', folderId: expr('{{ $json.id }}') },
    credentials: { microsoftOneDriveOAuth2Api: newCredential('MIMPER OneDrive') }
  },
  output: [{ id: 'I1', name: 'P-2025-0101.pdf', eTag: 'e1', size: 1000, file: { mimeType: 'application/pdf' }, lastModifiedDateTime: '2025-03-14T10:00:00Z', parentReference: { driveId: 'D1', path: '/drive/root:/PRESSUPOSTOS IA/2025' } }]
});

const unirLlistes = merge({
  version: 3.2,
  config: { name: 'Unir arrel i subcarpetes', parameters: { mode: 'append' } }
});

const nomesArxius = node({
  type: 'n8n-nodes-base.filter', version: 2.3,
  config: {
    name: 'Només arxius admesos',
    parameters: { conditions: { combinator: 'and', options: { caseSensitive: false, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [
        { leftValue: expr('{{ $json.file }}'), rightValue: '', operator: { type: 'object', operation: 'exists', singleValue: true } },
        { leftValue: expr("{{ $('Configuració').first().json.extensions.includes(($json.name || '').split('.').pop().toLowerCase()) }}"), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }
      ] } }
  },
  output: [{ id: 'I1', name: 'P-2025-0101.pdf', eTag: 'e1', size: 1000, file: { mimeType: 'application/pdf' }, lastModifiedDateTime: '2025-03-14T10:00:00Z', parentReference: { driveId: 'D1', path: '/drive/root:/PRESSUPOSTOS IA/2025' } }]
});

const registrar = node({
  type: 'n8n-nodes-base.postgres', version: 2.7,
  config: {
    name: 'Registrar document (anti-duplicats)',
    parameters: {
      operation: 'executeQuery',
      query: "select x->>'document_id' as document_id, (x->>'cal_processar')::boolean as cal_processar, x->>'estat' as estat, x->>'extensio' as extensio, $3 as item_id, $5 as nom_arxiu from (select mimper.registrar_document($1, $2, $3, $4, $5, $6, $7::bigint, $8, $9::timestamptz) as x) s",
      options: { queryReplacement: expr("{{ ['onedrive', $json.parentReference?.driveId ?? '', $json.id, ($json.parentReference?.path ?? '/').replace('/drive/root:', ''), $json.name, $json.file?.mimeType ?? '', $json.size ?? 0, $json.eTag ?? $json.cTag ?? '', $json.lastModifiedDateTime ?? $now.toISO()] }}") }
    },
    credentials: { postgres: newCredential('MIMPER Postgres') }
  },
  output: [{ document_id: '00000000-0000-0000-0000-000000000001', cal_processar: true, estat: 'detectat', extensio: 'pdf', item_id: 'I1', nom_arxiu: 'P-2025-0101.pdf' }]
});

const pendents = node({
  type: 'n8n-nodes-base.filter', version: 2.3,
  config: {
    name: 'Només nous o modificats',
    parameters: { conditions: { combinator: 'and', options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [{ leftValue: expr('{{ $json.cal_processar }}'), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }] } }
  },
  output: [{ document_id: '00000000-0000-0000-0000-000000000001', cal_processar: true, extensio: 'pdf', item_id: 'I1', nom_arxiu: 'P-2025-0101.pdf' }]
});

const limitProva = node({
  type: 'n8n-nodes-base.limit', version: 1,
  config: { name: 'Màxim N documents per execució', parameters: { maxItems: expr("{{ $('Configuració').first().json.max_documents }}") } },
  output: [{ document_id: '00000000-0000-0000-0000-000000000001', item_id: 'I1', nom_arxiu: 'P-2025-0101.pdf', extensio: 'pdf' }]
});

const lot = splitInBatches({ version: 3, config: { name: 'Un document cada vegada', parameters: { batchSize: 1 } } });

const marcarInici = node({
  type: 'n8n-nodes-base.postgres', version: 2.7,
  config: {
    name: 'Marcar en procés',
    parameters: { operation: 'executeQuery', query: 'select mimper.iniciar_processament($1::uuid) as ok, $1 as document_id', options: { queryReplacement: expr('{{ [$json.document_id] }}') } },
    credentials: { postgres: newCredential('MIMPER Postgres') }
  },
  output: [{ ok: '', document_id: '00000000-0000-0000-0000-000000000001' }]
});

const descarregar = node({
  type: 'n8n-nodes-base.microsoftOneDrive', version: 1.1,
  config: {
    name: 'Descarregar arxiu',
    onError: 'continueErrorOutput',
    parameters: { resource: 'file', operation: 'download', fileId: expr("{{ $('Un document cada vegada').item.json.item_id }}"), binaryPropertyName: 'data' },
    credentials: { microsoftOneDriveOAuth2Api: newCredential('MIMPER OneDrive') }
  },
  output: [{ name: 'P-2025-0101.pdf', size: 1000 }]
});

const llegir = node({
  type: '@llamaindex/n8n-nodes-llamacloud.llamaParsePlatform', version: 1,
  config: {
    name: 'Llegir document (Word, PDF, Excel, escanejats)',
    onError: 'continueErrorOutput',
    parameters: { operation: 'parse', tier: 'cost_effective', version: 'latest', inputType: 'binaryFile', inputDataFieldName: 'data' }
  },
  output: [{ markdown: 'PRESSUPOST Nº 0101 ...' }]
});

const textNet = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Preparar text',
    onError: 'continueErrorOutput',
    parameters: {
      mode: 'runOnceForEachItem', language: 'javaScript',
      jsCode: "const j = $json;" + '\n' + "let text = j.markdown ?? j.md ?? j.text ?? '';" + '\n' + "if (!text && Array.isArray(j.pages)) text = j.pages.map(p => p.md ?? p.markdown ?? p.text ?? '').join('\\n\\n');" + '\n' + "if (!text && j.result) text = typeof j.result === 'string' ? j.result : JSON.stringify(j.result);" + '\n' + "text = String(text || '').trim();" + '\n' + "if (text.length < 20) throw new Error('No s\\'ha pogut extreure text (document buit, imatge sense OCR o protegit)');" + '\n' + "const doc = $('Un document cada vegada').item.json;" + '\n' + "return { json: { document_id: doc.document_id, nom_arxiu: doc.nom_arxiu, text: text.slice(0, 60000), truncat: text.length > 60000 } };"
    }
  },
  output: [{ document_id: '00000000-0000-0000-0000-000000000001', nom_arxiu: 'P-2025-0101.pdf', text: 'PRESSUPOST ...', truncat: false }]
});

const interpretar = node({
  type: '@n8n/n8n-nodes-langchain.anthropic', version: 1,
  config: {
    name: 'Interpretar amb IA (Claude)',
    onError: 'continueErrorOutput',
    parameters: {
      resource: 'text', operation: 'message',
      modelId: { __rl: true, mode: 'id', value: expr("{{ $('Configuració').first().json.model_ia }}") },
      messages: { values: [{ role: 'user', content: expr('Arxiu: {{ $json.nom_arxiu }}\n\nText del document:\n"""\n{{ $json.text }}\n"""') }] },
      options: {
        maxTokens: 8000,
        temperature: 0,
        system: 'Ets un extractor de dades de documents comercials de MIMPER (Membranas Impermeabilizantes SLU, distribuïdor de sistemes d\'impermeabilització amb poliuretà líquid).' + '\n' + 'Respon NOMÉS amb un objecte JSON vàlid, sense text abans ni després i sense blocs de codi.' + '\n' + 'Esquema: {"tipus_document":"pressupost|factura_transport|tarifa|fitxa_tecnica|llista_preus|altre","confianca":0-1,"pressupost":{"numero":"","data":"YYYY-MM-DD","valid_fins":"YYYY-MM-DD|null","client":{"rao_social":"","cif":"","email":"","telefon":"","adreca":"","codi_postal":"","poblacio":""},"linies":[{"codi":"","descripcio":"","quantitat":0,"unitat":"","preu_unitari":0,"descompte_pct":0,"import":0}],"subtotal":0,"descompte_import":0,"transport_import":0,"transport_inclos":true,"base_imposable":0,"iva_pct":21,"iva_import":0,"total":0,"observacions":""}|null,"camps_dubtosos":[]}' + '\n' + 'Regles: copia els números exactament com apareixen (no els recalculis ni els arrodoneixis). Si un camp no apareix, posa null; MAI no t\'inventis cap dada.' + '\n' + 'El client és el destinatari del pressupost, no Mimper. Si el document no és un pressupost, posa "pressupost": null.' + '\n' + 'confianca: la teva seguretat que les dades extretes són correctes (0 a 1). Llista a camps_dubtosos els camps que no estiguin clars.'
      }
    }
  },
  output: [{ content: [{ type: 'text', text: '{"tipus_document":"pressupost","confianca":0.9,"pressupost":{"numero":"0101"}}' }] }]
});

const parsejar = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Validar format JSON',
    onError: 'continueErrorOutput',
    parameters: {
      mode: 'runOnceForEachItem', language: 'javaScript',
      jsCode: "const j = $json;" + '\n' + "let raw = j.content?.[0]?.text ?? j.text ?? j.output ?? j.message?.content ?? '';" + '\n' + "if (typeof raw !== 'string') raw = JSON.stringify(raw);" + '\n' + "raw = raw.replace(/^```(?:json)?\\s*/i, '').replace(/```\\s*$/, '').trim();" + '\n' + "const a = raw.indexOf('{'); const b = raw.lastIndexOf('}');" + '\n' + "if (a < 0 || b < a) throw new Error('La IA no ha retornat JSON');" + '\n' + "const dades = JSON.parse(raw.slice(a, b + 1));" + '\n' + "if (!dades.tipus_document) throw new Error('JSON sense tipus_document');" + '\n' + "const t = $('Preparar text').item.json;" + '\n' + "return { json: { document_id: t.document_id, text: t.text, dades: JSON.stringify(dades), model: $('Configuració').first().json.model_ia } };"
    }
  },
  output: [{ document_id: '00000000-0000-0000-0000-000000000001', text: '...', dades: '{}', model: 'claude-sonnet-5-5' }]
});

const desar = node({
  type: 'n8n-nodes-base.postgres', version: 2.7,
  config: {
    name: 'Validar i desar a PostgreSQL',
    parameters: { operation: 'executeQuery', query: 'select mimper.desar_document_extret($1::uuid, $2, $3::jsonb, $4) as resultat',
      options: { queryReplacement: expr('{{ [$json.document_id, $json.text, $json.dades, $json.model] }}') } },
    credentials: { postgres: newCredential('MIMPER Postgres') }
  },
  output: [{ resultat: { resultat: 'processat', numero: '0101' } }]
});

const registrarError = node({
  type: 'n8n-nodes-base.postgres', version: 2.7,
  config: {
    name: 'Registrar incidència',
    parameters: { operation: 'executeQuery', query: "select mimper.registrar_error($1::uuid, 'MIMPER - 01', $2, $3, $4::jsonb) as ok, json_build_object('resultat','error','missatge',$3::text) as resultat",
      options: { queryReplacement: expr("{{ [$('Un document cada vegada').item.json.document_id, $prevNode.name, $json.error?.message ?? $json.error ?? 'error', JSON.stringify({ arxiu: $('Un document cada vegada').item.json.nom_arxiu, node: $prevNode.name })] }}") } },
    credentials: { postgres: newCredential('MIMPER Postgres') }
  },
  output: [{ ok: '', resultat: { resultat: 'error' } }]
});

const resum = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Resum de la importació',
    parameters: {
      mode: 'runOnceForAllItems', language: 'javaScript',
      jsCode: "const r = $input.all().map(i => i.json.resultat ?? {});" + '\n' + "const comptar = (k) => r.filter(x => (x.resultat ?? '') === k).length;" + '\n' + "const comptadors = { processats: r.length, ok: comptar('processat'), pendent_revisio: comptar('pendent_revisio'), duplicats: comptar('duplicat'), classificats: comptar('classificat'), errors: comptar('error') };" + '\n' + "const estat = comptadors.errors > 0 ? 'amb_avisos' : (comptadors.pendent_revisio > 0 ? 'amb_avisos' : 'ok');" + '\n' + "return [{ json: { execucio_id: $('Obrir registre execució').first().json.execucio_id, estat, comptadors } }];"
    }
  },
  output: [{ execucio_id: 1, estat: 'ok', comptadors: { processats: 10 } }]
});

const tancar = node({
  type: 'n8n-nodes-base.postgres', version: 2.7,
  config: {
    name: 'Tancar registre execució',
    parameters: { operation: 'executeQuery', query: 'select mimper.tancar_execucio($1::bigint, $2, $3::jsonb) as ok',
      options: { queryReplacement: expr('{{ [$json.execucio_id, $json.estat, JSON.stringify($json.comptadors)] }}') } },
    credentials: { postgres: newCredential('MIMPER Postgres') }
  },
  output: [{ ok: '' }]
});

const nota = sticky('## MIMPER · 01 · Importació documental\n\n**Abans de provar:**\n1. Credencials: `MIMPER OneDrive` i `MIMPER Postgres` (usuari `n8n_mimper`).\n2. Posa l\'ID de la carpeta a **Configuració**.\n3. `max_documents` = 10 per a la prova.\n\nNo esborra ni sobreescriu res: els duplicats queden com a incidència. Validacions i desat: funcions SQL `mimper.*`.', [], { color: 4 });

export default workflow('mimper-01', 'MIMPER - 01 - Importar documents')
  .add(inici)
  .to(configuracio)
  .add(programat)
  .to(configuracio)
  .add(configuracio)
  .to(obrirExecucio)
  .to(llistarArrel)
  .add(llistarArrel)
  .to(unirLlistes.input(0))
  .add(llistarArrel)
  .to(nomesSubcarpetes.to(llistarSubcarpetes.to(unirLlistes.input(1))))
  .add(unirLlistes)
  .to(nomesArxius)
  .to(registrar)
  .to(pendents)
  .to(limitProva)
  .to(lot
    .onDone(resum.to(tancar))
    .onEachBatch(marcarInici.to(descarregar)))
  .add(descarregar)
  .to(llegir)
  .to(textNet)
  .to(interpretar)
  .to(parsejar)
  .to(desar)
  .to(nextBatch(lot))
  .add(descarregar.onError(registrarError))
  .add(llegir.onError(registrarError))
  .add(textNet.onError(registrarError))
  .add(interpretar.onError(registrarError))
  .add(parsejar.onError(registrarError))
  .add(registrarError)
  .to(nextBatch(lot))
  .add(nota);

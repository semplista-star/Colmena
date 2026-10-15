# Prompt para Base44 — Motor de automatización Mimper (Pipedrive + Sage 200)

> Versión 2. Sustituye a la versión anterior, que creaba un CRM propio.
> Ahora **Base44 no es un CRM**: es el **motor invisible** que conecta Pipedrive y Sage 200,
> con un panel de control mínimo. Los comerciales siguen trabajando **solo en Pipedrive**.

## Cómo usarlo

1. En Base44 crea una **app nueva** (no reutilices la anterior, porque arrastraría las pantallas de CRM).
2. Pega el **PROMPT 1**. Cuando termine, pega el 2, después el 2B, el 3, etc. Prueba entre uno y otro.
   **La documentación se sube después del PROMPT 2B**, en la pantalla "Conocimiento".
3. Cuando Base44 pida **secretos o claves** (Secrets / Environment variables), introduce:
   - `PIPEDRIVE_API_TOKEN`: en Pipedrive, Configuración personal → API.
   - `PIPEDRIVE_DOMAIN`: el subdominio, p. ej. `mimper` si entráis por `mimper.pipedrive.com`.
   - Los datos de Sage 200, cuando el partner de Sage los dé (ver PROMPT 4).
4. Importa los CSV de tarifa de transporte (`TarifaTransporte.csv`, `ZonaCP.csv`,
   `CondicionRecargo.csv`) en las tablas que cree el PROMPT 2.

---

### PROMPT 1 — QUÉ ES ESTO (contexto + reglas)

```
Vas a construir "Mimper Autopilot": un MOTOR DE AUTOMATIZACIÓN, no un CRM.
Lee todo antes de empezar.

QUIÉN LO ENCARGA: Colmena (colmenalife.com), plataforma de agentes de IA que automatiza
procesos de empresas.

CLIENTE: Mimper (mimper.es) = MEMBRANAS IMPERMEABILIZANTES SLU / Mimper Spain.
Distribuidor español de sistemas de impermeabilización con poliuretano líquido y
membranas (más de 20 años, distribuidor oficial MARIS de Saint-Gobain, red de
aplicadores certificados). Vende a aplicadores, tiendas de pintura, constructoras y
particulares en toda España. Envía desde su almacén en Cataluña con la agencia
JOVI TRANS-LOGISTIC (Jovitrans, red DB Schenker). Muchos productos son mercancía
peligrosa ADR.

HERRAMIENTAS QUE YA USA MIMPER Y QUE NO SE SUSTITUYEN:
- PIPEDRIVE (CRM): los comerciales trabajan aquí. Cada presupuesto es un "deal".
- SAGE 200 (ERP): fuente de verdad de clientes, artículos, precios/tarifas, descuentos,
  stock, ofertas, pedidos, albaranes y facturas.

REGLAS DE ORO:
1. NO construyas un CRM. NO crees pantallas de clientes, contactos, deals ni pipeline.
   Los clientes y los productos se leen de Sage 200 (o de su exportación); los deals viven
   en Pipedrive.
2. El objetivo es que la INTERVENCIÓN HUMANA SEA LA MÍNIMA POSIBLE. Todo funciona solo,
   por webhooks y tareas programadas. Un humano solo interviene en las EXCEPCIONES.
3. Los cálculos de dinero (tarifas, descuentos, transporte, IVA, totales) se hacen con
   código determinista, nunca con la IA. La IA solo interpreta textos, emails y PDFs.
4. La IA nunca inventa precios, productos ni datos fiscales. Si falta algo, el caso pasa
   a EXCEPCIÓN.
5. Todo lo que hace el sistema queda en un REGISTRO (fecha, agente, deal/factura,
   acción, resultado, motivo).
6. Todo en español; importes en € con coma decimal.

QUÉ AUTOMATIZA:
A) PRESUPUESTOS IA: cuando un deal de Pipedrive llega a la etapa "Pedir presupuesto",
   el sistema calcula el presupuesto completo (productos, cantidades, precios de Sage,
   descuento del cliente, transporte), lo valida, lo escribe en el deal (productos,
   valor, PDF, nota), lo envía al cliente si todo está OK, hace el seguimiento y, cuando
   el cliente acepta, crea la oferta/pedido en Sage 200.
B) COSTES DE TRANSPORTE IA: calcula el coste de transporte Jovitrans de cada
   presupuesto y audita automáticamente las facturas de Jovitrans.

PANTALLAS (solo estas, nada más):
1. Panel: KPIs (presupuestos generados / enviados solos / en excepción / aceptados,
   importe, coste de transporte del mes, dinero recuperable de facturas) y la lista de
   EXCEPCIONES pendientes con botón "Aprobar" y "Rechazar".
2. Calculadora de transporte (para consultas sueltas).
3. Auditoría de facturas Jovitrans.
4. Reglas y límites de autonomía (editables por el admin).
5. Registro de actividad.
6. Configuración (conexiones, tarifas, % carburante mensual).
Acceso con login; solo usuarios de Mimper y Colmena.

En este primer paso crea solo la estructura de datos y las pantallas vacías. Los
siguientes prompts detallan cada parte.
```

### PROMPT 2 — MOTOR DE TRANSPORTE JOVITRANS

```
Crea las tablas TarifaTransporte (tipo salida/llegada, kg_hasta, zona, precio,
vigencia_desde, vigencia_hasta), ZonaCP (prefijo_cp, provincia_isla, zona, plazo_horas),
CondicionRecargo (nombre, tipo, valor, minimo, maximo, observaciones) y
CarburanteMensual (mes, porcentaje). Voy a importar los datos desde CSV; no inventes
ningún valor.

Crea una función de backend "calcularTransporte" (reutilizable por los otros agentes):
Entrada: cp_destino, municipio, bultos, kg, m3, es_adr, tipo (salida/llegada),
valor_mercancia, servicios_extra[], fecha.
1. Zona = por los 2 primeros dígitos del CP (ZonaCP). En Baleares (07) la isla decide la
   zona (Mallorca 10, Menorca/Ibiza 11, Formentera 12); si no se puede deducir, devuelve
   error "falta isla". Zonas 14, 15 y 16 = "a consultar" -> error, no inventes precio.
2. Peso volumétrico = m3 x 270 (Península) o m3 x 333 (Baleares, Ceuta, Melilla, Gibraltar).
3. Peso tasable = max(kg, peso volumétrico).
4. Tramo = primer kg_hasta >= peso tasable. Si supera 5000 kg -> "servicio DIRECT, cotizar".
5. Porte base = precio(tipo, tramo, zona) vigente en la fecha.
6. Recargos: carburante % del mes (si falta el % del mes -> aviso); ADR 15% (mín. 5 €)
   si es_adr; seguro Jovi-Trans 8% (mín. 0,90 €); y los servicios extra marcados según
   CondicionRecargo.
Salida: zona, plazo, peso tasable, tramo, porte base, recargos desglosados, total sin IVA
y con IVA 21%, avisos.

Pantalla "Calculadora de transporte" que usa esta función. Prueba con estos casos
(porte base, salida, sin recargos), que salen de facturas reales:
- CP 08006, 52 kg, 0,224 m3 -> 13,81 €
- CP 08020, 401 kg, 1,193 m3 -> 44,33 €
- CP 08440, 186 kg, 1,090 m3 -> 31,65 €
Si alguno no coincide, corrige antes de seguir.
```

### PROMPT 2B — BASE DE CONOCIMIENTO (aquí se sube toda la documentación)

> Se pega **después del PROMPT 2 y antes del PROMPT 3**. Cuando termine, sube todos los
> archivos en la pantalla "Conocimiento", revisa lo que extrae y apruébalo. A partir de ahí
> los agentes lo usan solos.

```
Crea la pantalla "Conocimiento", donde se sube toda la documentación de Mimper para que
los agentes aprendan. No es un CRM: es la memoria de los agentes.

1. SUBIDA: subida múltiple (PDF, Excel, Word, imágenes, zips). Cada archivo se clasifica
   automáticamente con IA en uno de estos tipos (editable):
   presupuesto_historico | lista_precios | ficha_tecnica | plantilla_presupuesto |
   condiciones_comerciales | factura_transporte | tarifa_transporte | otro.
   Si un archivo pesa demasiado, que se pueda subir por partes.

2. EXTRACCIÓN (automática al subir, con IA) a estas tablas:
   - SistemaImpermeabilizacion: nombre del sistema (cubierta transitable, no
     transitable, piscina, terraza bajo baldosa…), uso, productos que lleva en orden
     de aplicación, nº de capas, rendimiento kg/m² o l/m² por capa, merma %. Sale de
     las FICHAS TÉCNICAS.
   - EjemploPresupuesto: de cada PRESUPUESTO HISTÓRICO: fecha, cliente, tipo de cliente,
     petición original (si aparece), líneas (código, descripción, cantidad, precio,
     % dto), transporte cobrado o no y cuánto, total, estado (aceptado/rechazado/desconocido).
   - PropuestaRegla: reglas deducidas del histórico (dto. típico por tipo de cliente,
     importe a partir del cual se regala el transporte, margen mínimo observado, validez,
     forma de pago, textos fijos). Estado "pendiente de validar".
   - PlantillaPresupuesto: logo, datos fiscales, estructura, textos legales y condiciones.
   - Si hay listas de precios y no está conectado Sage, sirven como maestro de artículos
     provisional.
   Cada dato extraído guarda de qué archivo y de qué página sale.

3. REVISIÓN: antes de usar nada, muestra lo extraído en tablas con "Aprobar",
   "Corregir" y "Descartar", y un resumen: "X presupuestos leídos, Y sistemas, Z reglas
   propuestas, N archivos que no se han podido leer". Solo lo APROBADO lo usan los
   agentes.

4. USO POR LOS AGENTES (automático):
   - El Presupuestador, antes de hacer un presupuesto, busca los 5 EjemploPresupuesto más
     parecidos (mismo tipo de cliente, mismo sistema, importe similar) y los usa como
     referencia de estilo, productos habituales y cantidades. Calcula las cantidades con
     SistemaImpermeabilizacion y aplica solo las reglas aprobadas.
   - El Revisor compara el presupuesto nuevo con los ejemplos parecidos y avisa si se
     desvía mucho (p. ej. precio o cantidad más de un 20% distintos).

5. APRENDIZAJE CONTINUO (sin intervención humana):
   - Cada presupuesto enviado se guarda como nuevo EjemploPresupuesto; cuando el deal se
     gana o se pierde en Pipedrive, se actualiza su estado.
   - Cada vez que un humano corrige una EXCEPCIÓN (cambia cantidades, precios o
     productos), se guarda la corrección y el motivo. Si la misma corrección se repite
     3 veces, se propone una regla nueva (pendiente de validar).
   - Los archivos que lleguen por email a la dirección de conocimiento configurada (o
     a una carpeta) se procesan solos.
   - Cada mes: informe de qué ha aprendido y qué reglas nuevas propone.

Archivos de transporte: la tarifa ya está importada por CSV. Las facturas de Jovitrans
que se suban aquí pasan al Agente Auditor (PROMPT 5) y sirven para validar el motor de
transporte.
```

### PROMPT 3 — CONEXIÓN CON PIPEDRIVE + PRESUPUESTO AUTOMÁTICO

```
Conecta con la API de Pipedrive usando los secretos PIPEDRIVE_API_TOKEN y
PIPEDRIVE_DOMAIN (API v1/v2: deals, persons, organizations, products, deal products,
notes, activities, files, webhooks).

1. Al configurar, crea (si no existen) en el embudo de ventas las etapas:
   "Pedir presupuesto", "Presupuesto en revisión", "Presupuesto enviado",
   y usa Ganado/Perdido de Pipedrive.
2. Registra un webhook de Pipedrive (deal actualizado) hacia una función de backend de
   esta app. Cuando un deal entra en "Pedir presupuesto", ejecuta el AGENTE
   PRESUPUESTADOR:
   a) Lee el deal, su organización/persona, sus notas, emails y archivos adjuntos.
   b) Identifica al cliente en el maestro de clientes de Sage (por CIF, email o nombre)
      y toma su tarifa y su descuento. Si no se encuentra -> EXCEPCIÓN.
   c) Interpreta con IA lo que pide. Si viene en m², calcula las cantidades por sistema
      (rendimiento kg/m² x capas x m² + merma) y redondea a envases completos.
   d) Pone los precios del maestro de artículos de Sage y aplica las reglas comerciales.
   e) Suma pesos y volúmenes de los artículos y llama a calcularTransporte (ADR si algún
      artículo lo es). Según las reglas, el transporte se cobra o se regala.
   f) Calcula subtotal, descuentos, transporte, base, IVA 21% y total.
3. AGENTE REVISOR (siempre después del Presupuestador): comprueba precios frente a la
   tarifa, descuento <= máximo permitido, margen >= mínimo, cantidades coherentes,
   transporte y ADR aplicados, datos fiscales completos, totales correctos y que no
   haya artículos sin stock ni descatalogados.
   Resultado: OK / OK CON AVISOS / BLOQUEADO + motivos.
4. ESCRITURA EN PIPEDRIVE: añade las líneas como productos del deal (creando el producto
   en Pipedrive con el mismo código de Sage si no existe), actualiza el valor del deal,
   adjunta el PDF del presupuesto (plantilla de Mimper, numeración P-AAAA-0001) y deja
   una nota con el desglose y los avisos.
5. AUTONOMÍA:
   - Si es OK y está dentro de los límites de autonomía (importe máximo, descuento
     máximo, cliente existente), envía el presupuesto por email al cliente y mueve el
     deal a "Presupuesto enviado". Sin intervención humana.
   - Si no, mueve el deal a "Presupuesto en revisión", crea una actividad en Pipedrive
     para el propietario del deal con los motivos y lo muestra en EXCEPCIONES del Panel.
     Al pulsar "Aprobar" (en el Panel, o moviendo el deal a "Presupuesto enviado"),
     continúa solo.
   - Interruptor general "Modo prudente": si está activado, TODO pasa por revisión
     (recomendado las primeras semanas).
6. AGENTE SEGUIMIENTO (tarea diaria): deals en "Presupuesto enviado" sin respuesta a los
   3, 7 y 14 días -> envía email de seguimiento y lo registra como nota. A los 30 días
   -> marca el deal como perdido con motivo "sin respuesta" (configurable).
```

### PROMPT 4 — CONEXIÓN CON SAGE 200

```
Sage 200 es el ERP de Mimper y la fuente de verdad. Crea una capa "conectorSage" con
tres modos intercambiables (se elige en Configuración), para poder empezar ya y mejorar
después sin tocar los agentes:

MODO 1 — EXPORTACIÓN (para empezar ya): el admin sube (o llega por email a diario) un
Excel/CSV exportado de Sage con: Clientes (código, CIF, razón social, email, dirección,
CP, tarifa, % descuento, forma de pago) y Artículos (código, descripción, familia,
precio de tarifa, coste, stock, peso por envase, volumen por envase, es_ADR,
rendimiento kg/m²). Se guarda como caché de solo lectura. Muestra la fecha de la
última actualización y avisa si tiene más de 48 h.

MODO 2 — API: si el partner de Sage habilita la API o los web services de Sage 200,
usa SAGE_API_URL y SAGE_API_KEY (secretos) para leer clientes, artículos, precios y
stock en tiempo real y para CREAR ofertas y pedidos de cliente.

MODO 3 — PASARELA: un pequeño servicio instalado en el servidor de Mimper (lo
proporciona Colmena o el partner de Sage) expone endpoints HTTPS seguros
(/clientes, /articulos, /stock, /ofertas, /pedidos) con token. Usa SAGE_GATEWAY_URL y
SAGE_GATEWAY_TOKEN.

Funciones del conector: buscarCliente, obtenerArticulos, obtenerPrecio(cliente,
artículo), obtenerStock, crearOferta(presupuesto), crearPedido(presupuesto).
En MODO 1, crearOferta y crearPedido generan un archivo de importación para Sage y lo
envían por email a administración (es la única tarea manual que queda hasta tener el
modo 2 o 3).

Cuando un deal pasa a GANADO en Pipedrive (webhook) -> crearPedido en Sage y guarda el
número de pedido de Sage en un campo del deal.
```

### PROMPT 5 — AUDITORÍA AUTOMÁTICA DE FACTURAS JOVITRANS

```
AGENTE AUDITOR DE TRANSPORTE:
1. Entrada automática: las facturas PDF de Jovitrans llegan a un buzón o carpeta
   configurada; también se pueden subir a mano.
2. Extrae cada línea. Formato de ejemplo:
   "74/3505033/5 14/02 336 D SANT CUGAT DE PINTUR 08173 SANT CUGAT DEL VALL 1 165 0,410 22,99 6,31"
   = nº expedición | fecha | referencia (nº de albarán de Mimper) | D salida / R retorno |
   cliente | CP | población | bultos | kg | m³ | porte | recargos de la línea.
   Al pie: PORTES, SOBREPORTE POR INCREMENTO CARBURANTE, SUPLEMENTO POR ADR.
   Los archivos con "_R" son facturas rectificativas (abonos).
3. Recalcula cada línea con calcularTransporte usando la tarifa vigente en su fecha.
   VERDE (diferencia <= 0,05 €), ÁMBAR (falta tarifa de ese año o un dato), ROJO (cobrado
   de más).
4. Las ROJAS claras -> redacta y envía la reclamación a clientes@jovitrans.com (con
   "Modo prudente" activado, solo la deja preparada como excepción).
5. Asocia cada línea, por la referencia, al albarán o pedido de Sage y al deal de
   Pipedrive -> coste real de transporte por pedido y por cliente, y margen real.
6. Panel: coste por mes, por zona y por cliente, % ADR, top envíos más caros, total
   recuperable y clientes donde el transporte se come el margen.
```

### PROMPT 6 — INFORME Y PRUEBAS

```
1. AGENTE SUPERVISOR: cada lunes a las 8:00 envía por email al admin un informe:
   presupuestos generados, enviados solos, excepciones (y por qué), aceptados, importe,
   tasa de aceptación, coste de transporte, errores de Jovitrans y dinero recuperado,
   y propuesta de subir o bajar los límites de autonomía según los resultados.
2. Pruebas: crea en Pipedrive un deal de prueba en "Pedir presupuesto" con la nota
   "Impermeabilizar terraza de 80 m2 transitable, entrega en 41007 Sevilla" y
   comprueba el flujo completo en modo prudente. Después, un caso que debe quedar
   BLOQUEADO (descuento por encima del máximo). Enséñame el registro de cada paso y la
   lista de lo que no funciona.
```

---

## Límites reales de Base44 en este proyecto (léelo antes de empezar)

- **Pipedrive**: sin problema. Está en la nube y tiene buena API y webhooks.
- **Sage 200**: es la parte delicada. Si está instalado en el servidor de Mimper, Base44
  no puede conectarse directamente. Por eso el PROMPT 4 empieza con **exportaciones**
  (MODO 1) y deja preparados la API (MODO 2) y la pasarela (MODO 3). La pasarela es un
  pequeño programa que se instala en su servidor; lo puede hacer Colmena o el partner
  de Sage.
- **Lectura del buzón de email**: depende de las integraciones disponibles en vuestro
  plan de Base44. Si no se puede, se reenvían las facturas a mano o se usa una carpeta.

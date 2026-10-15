# Prompt para Base44 — Mimper Ops IA (Presupuestos IA + Costes de Transporte IA)

Este documento tiene dos partes:

1. **Cómo usarlo en Base44** (pasos para ti, desde cero).
2. **Los prompts** que tienes que copiar y pegar en Base44, por fases.

---

## 1. Cómo usarlo en Base44 (paso a paso)

1. Entra en **base44.com** y crea una cuenta (o inicia sesión).
2. Pulsa **"Create new app"**.
3. Copia el bloque **PROMPT 1 — CONTEXTO Y APP COMPLETA** (más abajo) y pégalo entero en el chat de Base44. Envía.
4. Espera a que Base44 genere la app. Revisa que existan las pantallas y las tablas (en Base44 se llaman *Entities*, en el menú **Data**).
5. Sube los archivos:
   - En la pantalla **Tarifas de transporte** sube `Tarifa nacional Jovitrans 2026 MIMPER.xlsx`.
   - En la pantalla **Facturas de transporte** sube los PDFs de facturas de Jovitrans (puedes subirlos de 10 en 10).
   - En la pantalla **Histórico de presupuestos** sube los presupuestos antiguos (PDF, Excel o Word) y la lista de precios de productos.
   - Si Base44 no te deja subir un archivo muy grande, pártelo (un PDF por archivo, o zips de menos de 25 MB).
6. Después pega los prompts **2, 3, 4 y 5** uno a uno, **esperando a que termine cada uno** y probando la app entre medias. Base44 funciona mucho mejor por pasos que con todo de golpe.
7. Al final pega el **PROMPT 6 — PRUEBAS** para que la propia app se valide con casos reales.

> Consejo: si algo sale mal, no rehagas la app. Escríbele a Base44 en el chat qué falla exactamente ("en la pantalla X, al pulsar Y, sale Z y debería salir W").

---

## 2. Los prompts

### PROMPT 1 — CONTEXTO Y APP COMPLETA

```
Quiero que construyas una aplicación web interna llamada "Mimper Ops IA".
Te explico todo desde cero: quién la encarga, para quién es, qué tiene que hacer y cómo.

=====================================================================
1. QUIÉN SOMOS: COLMENA
=====================================================================
Colmena (colmenalife.com) es una plataforma de agentes de inteligencia artificial
que automatiza procesos de empresas. Empezó como un sistema de 25 agentes de IA para
captación de clientes (analizar la web del cliente, encontrar contactos, escribir
emails personalizados, hacer seguimientos, clasificar respuestas y agendar reuniones).
Ahora Colmena da un paso más: automatiza también procesos internos de sus clientes.
Esta app es el primer proyecto de automatización de operaciones de Colmena para su
cliente Mimper. Debe verse profesional, sencilla y en español.

=====================================================================
2. EL CLIENTE: MIMPER
=====================================================================
Mimper (mimper.es) es la marca comercial de MEMBRANAS IMPERMEABILIZANTES SLU
(también "Mimper Spain"). Empresa española con más de 20 años distribuyendo
sistemas de impermeabilización con poliuretano líquido y membranas, con 25 años de
garantía en sus sistemas, distribuidor oficial de MARIS (Saint-Gobain) y con una red
nacional de aplicadores certificados.
Sus clientes son: aplicadores e impermeabilizadores, tiendas de pintura y droguerías,
constructoras, empresas de rehabilitación y cubiertas, y algunos particulares, en toda
España (península, Baleares, y ocasionalmente Canarias/Ceuta/Melilla/Andorra).
Mimper envía la mercancía desde su almacén en Cataluña mediante la agencia de
transporte JOVI TRANS-LOGISTIC (Jovitrans), que trabaja con la red de DB SCHENKER.
Muchos de sus productos (poliuretanos, imprimaciones, disolventes) son mercancía
peligrosa ADR, lo que añade recargos de transporte.

Hoy Mimper hace a mano dos tareas que le cuestan mucho tiempo:
  A) Calcular cuánto cuesta enviar un pedido (y comprobar si la factura del
     transportista está bien cobrada).
  B) Preparar presupuestos para sus clientes (productos + cantidades + precios +
     descuentos + transporte).
La app tiene que automatizar las dos con IA, y además tener "agentes de control"
que vigilen que todo es correcto antes de que llegue al cliente.

=====================================================================
3. USUARIOS Y PERMISOS
=====================================================================
- Administrador (Colmena / dirección de Mimper): ve y configura todo.
- Comercial / Oficina Mimper: crea presupuestos, calcula transportes, sube facturas.
- Solo lectura (dirección): ve paneles e informes.
Login obligatorio. Nadie fuera de Mimper/Colmena puede ver datos.

=====================================================================
4. MÓDULO A — COSTES DE TRANSPORTE IA
=====================================================================
Objetivo: dado un envío (código postal destino, nº bultos, kg, m³, si es ADR y
servicios extra), calcular al céntimo cuánto cobrará Jovitrans, y auditar las
facturas reales de Jovitrans comparándolas con la tarifa.

4.1 La tarifa (archivo "Tarifa nacional Jovitrans 2026 MIMPER.xlsx")
El Excel tiene estas hojas:
  - "Sortides" (SALIDAS: del almacén de Mimper al cliente) -> tabla de precios.
  - "Arribades" (LLEGADAS: del cliente al almacén de Mimper, devoluciones/recogidas)
    -> misma estructura, precios más altos.
  - "Zones" -> asigna una ZONA (1 a 16) a cada provincia según el código postal.
  - "Condiciones Generales" y "Condiciones Especiales" -> recargos y servicios extra.
  - Vigencia: del 09/01/2026 al 31/12/2026.
Estructura de las tablas Sortides/Arribades:
  - Filas = tramos de peso "Kg hasta": 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1250, 1500,
    1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000.
  - Columnas = zonas 1 a 13.
  - Cada celda = precio en € por expedición (envío).
Tabla de zonas (por los 2 primeros dígitos del código postal = provincia), ejemplos:
  Barcelona 08 -> zona 1; Girona 17 -> 2; Lleida 25 y Tarragona 43 -> 3;
  Madrid 28 -> 6; Sevilla 41 -> 7; Mallorca 07 -> 10; Ibiza/Menorca 07 -> 11;
  Formentera 07 -> 12; Gibraltar -> 13; Ceuta -> 14; Melilla -> 15; Andorra -> 16.
  OJO: todas las Baleares comparten el CP 07xxx; la isla se decide por el municipio
  (pide al usuario la isla si el CP empieza por 07 y no se puede deducir).
  Zonas 14, 15, 16 = "a consultar" (la app debe avisar y no inventar precio).
IMPORTA LA TARIFA DESDE EL EXCEL que subiré; no inventes ningún precio.

4.2 Cómo se calcula el precio (regla verificada con facturas reales)
  1. Peso volumétrico = m³ x 270 (Península) o m³ x 333 (Baleares, Ceuta,
     Melilla, Gibraltar).
  2. Peso tasable = el MAYOR entre el peso real (kg) y el peso volumétrico.
  3. Se busca el primer tramo de la tabla cuyo "Kg hasta" sea >= peso tasable
     (siempre se redondea HACIA ARRIBA al siguiente tramo).
  4. Se busca la zona del código postal destino.
  5. PORTE BASE = celda (tramo, zona) de la hoja Sortides (o Arribades si es recogida).
     Ejemplo real: Barcelona (zona 1), 52 kg y 0,224 m³ -> volumétrico 60,5 kg ->
     tasable 60,5 -> tramo 70 kg -> 13,81 € (coincide con la factura).
  6. Si el peso tasable supera 5.000 kg -> "servicio DIRECT, pedir cotización".
4.3 Recargos (se suman al porte base; cada uno configurable en la app):
  - Recargo de carburante: % sobre el porte base. Cambia CADA MES. La app debe tener
    una tabla "Carburante mensual" (mes, %) que el admin actualiza; si falta el % del
    mes, avisar. (En las facturas de 2025 rondaba el 5,7 %.)
  - Mercancía ADR: 15 % del porte, mínimo 5,00 € por envío.
  - Seguro Jovi-Trans: 8 % del porte, mínimo 0,90 € (por defecto incluido, se puede
    desactivar). Seguro a todo riesgo opcional: 0,6 % del valor de la mercancía,
    mínimo 7,00 €.
  - Reembolso (contra reembolso): 5 % del importe cobrado, mín 3 €, máx 90,15 €.
  - Escaneo albarán cliente: 1,50 €/expedición. Manual booking: 2,00 €.
  - Segunda entrega: 35 % del porte.
  - Entrega a particulares: 20 €. Preaviso: 10 €.
  - Fecha concertada: 20 % del porte. Fecha y hora concertada: 220 €.
  - Grandes superficies: 20 % del porte + 7 € de gestión.
  - Zonas costeras en temporada alta (1 junio – 30 septiembre): 20 % del porte.
  - Despacho de aduanas (Andorra, Ceuta, Melilla, Gibraltar): 45 €.
  - Acceso fuera de carretera convencional (masías, obras, caminos): por kg tasable,
    mínimo 35 €.
  - Manipulación adicional (antigua "ayuda de mozos") por tramos de kg: 31-300 kg 75 €,
    301-500 90 €, 501-750 110 €, 751-1000 125 €, 1001-2000 180 €, 2001-2500 200 €.
  - Paquetería ("System"): máx 5 bultos, 30 kg por bulto, 150 kg tasables por envío;
    bulto de más de 30 kg sin paletizar: +50 €; si no cumple nº de bultos: +80 € de
    paletización. Largos tipo 1 (hasta 4 m): +60 €; largos tipo 2 (hasta 6 m): +120 €.
  - Palet no remontable: volumen = base x 2,20 m de alto.
  Lee los importes exactos de las hojas de condiciones del Excel; si algo no cuadra con
  esta lista, manda el Excel y muéstrame la diferencia.
4.4 Pantalla "Calculadora de transporte"
  Formulario: CP destino, municipio, nº bultos, kg, m³ (o largo x ancho x alto por
  bulto y que calcule los m³), ¿ADR?, ¿salida o llegada?, valor de la mercancía,
  servicios extra (checkboxes).
  Resultado: zona, plazo de entrega (de la hoja Zones: 24, 24/48, 48, 48/72…),
  peso tasable, tramo, porte base, cada recargo desglosado, total sin IVA y con IVA 21 %.
  Botón "Usar en presupuesto".
  También: campo de texto libre donde el usuario escribe en lenguaje natural
  ("3 cubos de 25 kg de poliuretano a Sevilla 41007") y la IA rellena el formulario.
4.5 Pantalla "Facturas de transporte" (auditoría)
  - Subo los PDFs de factura de Jovitrans. La IA extrae TODAS las líneas.
  - Formato de cada línea de factura (ejemplo):
    "74/3505033/5 14/02 336 D SANT CUGAT DE PINTUR 08173 SANT CUGAT DEL VALL 1 165 0,410 22,99 6,31"
    = nº expedición | fecha | referencia/albarán Mimper | D (salida) o R (retorno/llegada)
    | cliente destino | código postal | población | bultos | kg | m³ | porte | recargos de
    la línea (carburante + ADR).
  - Al final de cada factura hay totales: "PORTES", "SOBREPORTE POR INCREMENTO
    CARBURANTE", "SUPLEMENTO POR ADR". Las facturas con "_R" en el nombre son
    rectificativas (abonos, importes negativos).
  - Por cada línea, la app recalcula el precio con la tarifa y marca:
      VERDE: coincide (diferencia <= 0,05 €).
      ÁMBAR: diferencia pequeña o falta un dato.
      ROJO: cobrado de más -> genera texto de reclamación a clientes@jovitrans.com.
  - Panel: total facturado por mes, coste medio por envío, por zona, por cliente,
    % ADR, envíos más caros y dinero recuperable por errores.

=====================================================================
5. MÓDULO B — PRESUPUESTOS IA
=====================================================================
Objetivo: que un comercial pueda generar un presupuesto correcto en 1-2 minutos a
partir de una petición del cliente (email, texto, WhatsApp, PDF de mediciones o
nota de voz transcrita), con el formato y las condiciones de Mimper.

5.1 Aprendizaje a partir de lo que ya existe
  - Subiré: presupuestos antiguos (PDF, Excel, Word), la lista de precios/tarifa de
    productos, y si existe, la plantilla de presupuesto y las condiciones comerciales.
  - La IA debe leerlos y extraer a la base de datos:
      * Catálogo de productos: referencia, nombre, familia (membrana, imprimación,
        top coat, malla, disolvente, accesorio…), formato/envase (kg o litros por
        envase), precio de tarifa, ¿es ADR?, peso por envase, volumen por envase
        (m³), rendimiento/consumo (kg/m² por capa) si aparece.
      * Clientes: nombre, CIF, tipo (aplicador, tienda, constructora, particular),
        dirección, CP, descuento habitual.
      * Histórico de presupuestos: fecha, cliente, líneas, descuentos aplicados,
        transporte cobrado o no, total, estado (aceptado / no aceptado si se sabe).
  - De ese histórico, la IA deduce y me ENSEÑA para que yo las valide (no las aplica
    sin validar): descuento típico por tipo de cliente, cuándo se regala el
    transporte (p. ej. a partir de cierto importe), márgenes, textos y condiciones
    que siempre se ponen (validez, forma de pago, plazo de entrega, garantía).
  - Pantalla "Reglas comerciales" donde el admin edita y aprueba esas reglas.

5.2 Crear un presupuesto
  1. El comercial pega la petición o sube el archivo y elige/crea el cliente.
  2. La IA entiende qué pide. Si viene en m² (p. ej. "impermeabilizar una terraza de
     80 m²"), calcula las cantidades de cada producto del sistema usando el
     rendimiento por m² y el nº de capas, y redondea a envases completos.
  3. Pone los precios del catálogo y aplica las reglas comerciales del cliente.
  4. Calcula el peso y el volumen totales del pedido y llama al MÓDULO A para el
     coste de transporte (con ADR si algún producto lo es). Según las reglas,
     el transporte se repercute al cliente, se incluye o se regala.
  5. Muestra un borrador editable: líneas, cantidades, precio, descuento, subtotal,
     transporte, base imponible, IVA 21 %, total. También el margen estimado
     (solo visible internamente).
  6. Al aprobar: genera PDF con el diseño de la plantilla de Mimper (logo, datos
     fiscales, nº de presupuesto correlativo, fecha, validez, condiciones) y
     un borrador de email para enviarlo al cliente.
  7. Estados: Borrador -> Pendiente de revisión -> Aprobado -> Enviado ->
     Aceptado / Rechazado / Caducado.
  Si falta información (CP, cantidad, producto ambiguo), la IA NO inventa: pregunta.

=====================================================================
6. AGENTES DE IA DE CONTROL (supervisan los módulos)
=====================================================================
Crea estos agentes. Cada uno deja registro de lo que hace en una tabla
"Registro de agentes" (fecha, agente, objeto revisado, resultado, motivo).
Ningún agente envía nada a un cliente sin aprobación humana.

  AG-T1 "Importador de tarifas": lee el Excel de tarifa, lo carga en la BD y comprueba
       que no faltan tramos ni zonas. Avisa si la tarifa caduca en < 30 días.
  AG-T2 "Auditor de facturas de transporte": revisa cada factura subida línea a línea
       contra la tarifa (verde/ámbar/rojo) y prepara la reclamación de las rojas.
  AG-T3 "Vigilante de carburante": cada mes recuerda actualizar el % de carburante y
       detecta si el % facturado no coincide con el configurado.
  AG-P1 "Presupuestador": genera el borrador de presupuesto (Módulo B).
  AG-P2 "Revisor de presupuestos" (control de calidad, se ejecuta SIEMPRE antes de
       pasar a "Aprobado"). Comprueba:
         - precios = tarifa vigente del catálogo (o con descuento autorizado);
         - descuento <= máximo permitido para ese cliente/tipo;
         - margen >= mínimo configurado;
         - cantidades coherentes con los m² y el rendimiento;
         - transporte calculado e incluido según las reglas, ADR aplicado si toca;
         - datos fiscales del cliente completos; sumas e IVA correctos;
         - no hay productos descatalogados.
       Resultado: APROBADO / APROBADO CON AVISOS / BLOQUEADO, con la lista de motivos.
  AG-P3 "Seguimiento": presupuestos enviados sin respuesta a los 3, 7 y 14 días ->
       propone email de seguimiento (lo envía un humano). Marca caducados.
  AG-S1 "Supervisor / Informe semanal": cada lunes resume: presupuestos creados,
       enviados, aceptados, importe, tasa de aceptación, coste de transporte del
       mes, errores detectados en facturas y dinero recuperable, avisos pendientes.

=====================================================================
7. DATOS (entidades) que debe tener la app
=====================================================================
TarifaTransporte (tipo salida/llegada, tramo_kg, zona, precio, vigencia),
ZonaCP (prefijo CP, provincia/isla, zona, plazo), CondicionRecargo (nombre, tipo %,
fijo o por kg, valor, mínimo, máximo), CarburanteMensual (mes, %),
CalculoTransporte, FacturaTransporte, LineaFacturaTransporte (con precio esperado,
diferencia y estado), Producto, Cliente, ReglaComercial, Presupuesto,
LineaPresupuesto, ArchivoSubido, RegistroAgente, Usuario.

=====================================================================
8. PANTALLAS (menú lateral)
=====================================================================
Inicio (panel con KPIs y avisos de los agentes) · Calculadora de transporte ·
Facturas de transporte · Tarifas de transporte · Presupuestos (lista + nuevo) ·
Clientes · Productos · Histórico de presupuestos (subida de archivos) ·
Reglas comerciales · Agentes (estado y registro) · Configuración.

=====================================================================
9. REGLAS DE CONSTRUCCIÓN
=====================================================================
- Todo en español. Importes en € con 2 decimales y coma decimal (formato español).
- La IA nunca inventa precios, tarifas ni datos fiscales: si no hay dato, pregunta o
  avisa.
- Los cálculos de dinero (tarifa, recargos, IVA, totales) se hacen con lógica
  determinista (código), NO con la IA. La IA solo interpreta textos y archivos.
- Cada cálculo muestra el desglose para poder auditarlo.
- Diseño limpio, azul y gris, que funcione bien en móvil.
Empieza construyendo la estructura de datos y las pantallas. En los siguientes
mensajes te pediré cada módulo en detalle.
```

---

### PROMPT 2 — IMPORTAR LA TARIFA Y CALCULADORA DE TRANSPORTE

```
Ahora implementa el Módulo A, parte 1:
1. En "Tarifas de transporte", un botón para subir el Excel "Tarifa nacional Jovitrans
   2026 MIMPER.xlsx". Extrae las hojas Sortides, Arribades y Zones y guarda cada celda
   (tramo, zona, precio) en TarifaTransporte, y cada provincia en ZonaCP. Muestra una
   tabla para revisarlo y un botón "Confirmar importación".
2. Carga los recargos de las hojas "Condiciones Generales" y "Condiciones Especiales" en
   CondicionRecargo y deja que el admin los edite.
3. Implementa la Calculadora de transporte con la regla:
   peso tasable = max(kg reales, m³ x 270 [x 333 en Baleares/Ceuta/Melilla/Gibraltar]),
   tramo = primer "Kg hasta" >= peso tasable, precio = celda (tramo, zona) + recargos.
4. Prueba con estos 3 casos, que deben dar exactamente este PORTE BASE (sin recargos):
   - CP 08006 (Barcelona), 1 bulto, 52 kg, 0,224 m³ -> 13,81 €
   - CP 08020 (Barcelona), 1 bulto, 401 kg, 1,193 m³ -> 44,33 €
   - CP 08440 (Cardedeu), 1 bulto, 186 kg, 1,090 m³ -> 31,65 €
   Si alguno no coincide, revisa la importación antes de seguir.
```

### PROMPT 3 — AUDITORÍA DE FACTURAS DE TRANSPORTE

```
Implementa la pantalla "Facturas de transporte" y el agente AG-T2:
1. Subida múltiple de PDFs de facturas de Jovitrans.
2. Extrae cada línea con el formato descrito (expedición, fecha, referencia, D/R,
   cliente, CP, población, bultos, kg, m³, porte, recargos línea) y los totales de pie
   (PORTES, SOBREPORTE CARBURANTE, SUPLEMENTO ADR). Detecta rectificativas (_R).
3. Recalcula cada línea con la tarifa vigente en la fecha de la expedición
   (ojo: las facturas de 2025 pueden llevar la tarifa 2025; si no está cargada, marca
   la línea en ÁMBAR "tarifa del año no cargada", no en rojo).
4. Semáforo verde/ámbar/rojo, filtros, exportar a Excel y texto de reclamación.
5. Panel con: coste de transporte por mes, por zona y por cliente, coste medio por kg,
   % de envíos ADR, top 10 envíos más caros, total recuperable.
```

### PROMPT 4 — PRESUPUESTOS IA

```
Implementa el Módulo B (Presupuestos IA) y los agentes AG-P1 y AG-P2:
1. Pantalla "Histórico de presupuestos": subida múltiple de PDF/Excel/Word. La IA
   extrae productos, clientes y presupuestos y los guarda (Producto, Cliente,
   Presupuesto, LineaPresupuesto). Muestra lo extraído para revisarlo antes de guardar.
2. Con el histórico, genera una propuesta de "Reglas comerciales" (descuentos por
   tipo de cliente, cuándo se incluye el transporte, margen mínimo, validez, forma de
   pago, textos fijos) y déjalas en estado "Pendiente de validar" hasta que el admin
   las apruebe.
3. Pantalla "Nuevo presupuesto" con el flujo descrito (petición en texto libre o
   archivo -> borrador editable -> transporte automático del Módulo A -> revisión
   AG-P2 -> PDF + email).
4. Si se piden m², calcula cantidades con el rendimiento (kg/m² por capa x nº capas x
   m², + 5 % de merma configurable) y redondea a envases completos. Muestra el cálculo.
5. Numeración correlativa: P-AAAA-0001.
```

### PROMPT 5 — AGENTES DE CONTROL Y PANEL

```
Implementa los agentes AG-T1, AG-T3, AG-P3 y AG-S1, la pantalla "Agentes" y el panel
de Inicio:
- Pantalla Agentes: tarjeta por agente con estado, última ejecución, nº de avisos y
  su registro. Botón "Ejecutar ahora".
- Tareas programadas: AG-T3 el día 1 de cada mes; AG-P3 cada día a las 9:00;
  AG-S1 cada lunes a las 8:00 (envía el informe por email al admin).
- Panel de Inicio: presupuestos del mes (creados, enviados, aceptados, importe,
  tasa de aceptación), coste de transporte del mes, errores de facturación y
  dinero recuperable, y la lista de avisos pendientes de todos los agentes.
```

### PROMPT 6 — PRUEBAS FINALES

```
Haz una revisión completa de la app:
1. Calcula de nuevo con la tarifa todas las líneas de las facturas subidas y dime qué
   % coincide en verde. Si es menor del 95 %, investiga por qué (zonas, factor
   volumétrico, tarifa de otro año, recargos) y propón la corrección.
2. Coge 5 presupuestos antiguos del histórico, recrea cada uno desde su petición con
   el Presupuestador y compara el resultado con el original (líneas, precios, transporte,
   total). Enséñame las diferencias.
3. Comprueba que el Revisor (AG-P2) bloquea un presupuesto con descuento por encima
   del máximo y otro sin transporte cuando debería llevarlo.
4. Lista lo que falta o no funciona.
```

---

## Notas para Colmena (no pegar en Base44)

- **Lo verificado** con las facturas reales de Jovitrans: factor volumétrico de 270 kg/m³ en Península, redondeo al tramo superior y precio por celda (tramo, zona). Los tres casos del PROMPT 2 salen de facturas de julio de 2026.
- **Lo pendiente de confirmar**: la columna de recargos de cada línea de factura parece ser carburante (~5,7 % en 2025) + ADR (15 %, mín. 5 €). En algunos envíos a Baleares hay un extra que todavía no se explica. Hay que confirmarlo con Mimper o con Jovitrans.
- **Facturas de 2025**: se facturaron con la tarifa 2025, que no tenemos (solo la de 2026). Para auditar 2025 al céntimo, pedir a Mimper la tarifa 2025.
- **Presupuestos**: el prompt está escrito sin haber visto todavía sus archivos. Cuando los tengamos, se ajustan los apartados 5.1 y 5.2 a su plantilla y sus reglas reales.

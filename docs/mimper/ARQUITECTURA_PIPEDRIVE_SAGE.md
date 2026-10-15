# Mimper — Automatización con Pipedrive + Sage 200 (sin CRM nuevo)

## Idea principal

Objetivo: **que la intervención humana sea la mínima posible**. Mimper **no cambia de herramientas**. Los comerciales siguen trabajando en **Pipedrive** y la
administración en **Sage 200**. Los agentes de IA de Colmena trabajan **por detrás** y
conectan ambos: leen, calculan, escriben y avisan. No hay ninguna app nueva que aprender
(solo un pequeño panel de control para el administrador).

```
   Cliente (email / web / teléfono)
              │
              ▼
   ┌───────────────────┐   webhook    ┌──────────────────────────────┐   lectura/escritura   ┌──────────────┐
   │     PIPEDRIVE     │ ───────────▶ │   COLMENA (agentes de IA)    │ ◀──────────────────▶ │   SAGE 200   │
   │  deals, personas, │ ◀─────────── │  - Presupuestador            │   clientes, artículos, │  (ERP)       │
   │  productos, notas │  productos,  │  - Motor de transporte       │   tarifas, stock,      │              │
   │  actividades      │  PDF, notas, │  - Revisor (control)         │   ofertas, pedidos,    │              │
   └───────────────────┘  actividades │  - Auditor facturas Jovitrans│   albaranes            └──────────────┘
                                      │  - Seguimiento / Informe     │
                                      └──────────────────────────────┘
```

- **Sage 200 = la verdad de los datos**: clientes (CIF, dirección, descuentos), artículos,
  precios/tarifas, stock, pedidos, albaranes y facturas.
- **Pipedrive = donde trabaja el comercial**: cada presupuesto es un *deal*.
- **Colmena = el cerebro**: el código de este repositorio (Next.js en Vercel + Supabase),
  donde ya viven los agentes de Colmena.

## Flujo de un presupuesto, automatizado de punta a punta

1. **Entra la petición.** Llega un email a presupuestos@mimper… o el comercial crea un deal
   en Pipedrive y pega la petición en una nota (o adjunta planos o mediciones).
2. **Disparador.** El deal entra en la etapa **"Pedir presupuesto"** y Pipedrive avisa a
   Colmena con un webhook.
3. **Agente Presupuestador.**
   - Identifica al cliente en **Sage** (por CIF, email o nombre) y lee su tarifa y su descuento.
   - Entiende la petición. Si viene en m², calcula las cantidades por sistema
     (rendimiento × capas × m² + merma) y redondea a envases.
   - Toma los precios y el stock de **Sage**.
   - Calcula el peso y el volumen del pedido y obtiene el **coste de transporte Jovitrans**
     con el motor de tarifas (m³ × 270, tramo superior, zona por CP y recargos ADR,
     carburante, etc.).
4. **Agente Revisor (control).** Comprueba los precios frente a la tarifa de Sage, el
   descuento máximo, el margen mínimo, el transporte, el ADR, los datos fiscales y los
   totales. El resultado es OK / OK con avisos / BLOQUEADO.
5. **Escritura en Pipedrive.**
   - Añade las líneas de producto al deal (Pipedrive *Products*) y actualiza su valor.
   - Adjunta el **PDF del presupuesto** con la plantilla de Mimper.
   - Deja una nota con el desglose (precios, descuentos, transporte, margen) y los avisos.
   - Crea una actividad "Revisar y enviar presupuesto" para el comercial y mueve el deal a
     **"Presupuesto listo para revisar"**.
6. **Envío automático, el humano solo ve las excepciones.**
   - Si el Revisor da **OK** y el presupuesto está dentro de los límites (importe máximo,
     cliente conocido en Sage, sin productos dudosos), Colmena **lo envía solo** al cliente,
     crea la **oferta en Sage 200** y mueve el deal a "Presupuesto enviado". Nadie lo toca.
   - Solo si el resultado es **OK con avisos** o **BLOQUEADO** (o si supera los límites),
     se crea una actividad en Pipedrive para que un comercial lo revise. Con un clic
     ("Aprobar") sigue el flujo automático.
   - Los límites los fija Mimper y se pueden ir subiendo a medida que se confíe en el
     sistema. Al principio conviene revisarlo todo durante 2–4 semanas y después pasar a
     revisar solo las excepciones.
7. **Seguimiento automático.** Si no hay respuesta en 3, 7 o 14 días, el agente **envía
   solo** el email de seguimiento. Si el cliente contesta, la IA clasifica la respuesta:
   acepta → paso 8; pide un cambio → nuevo presupuesto; duda o queja → aviso al comercial.
8. **Aceptación → pedido.** Cuando el cliente acepta (por email o al firmar), Colmena marca
   el deal como ganado y crea el **pedido de cliente en Sage 200**. Nadie vuelve a teclear
   nada.

**Intervención humana que queda:** las excepciones que marca el Revisor, las quejas o
negociaciones de los clientes y la decisión de subir los límites de autonomía.

## Flujo del transporte

1. **Antes de vender:** cálculo automático dentro de cada presupuesto (paso 3).
2. **Después de enviar:** llegan las facturas de Jovitrans (por email o en una carpeta) y el
   **Agente Auditor** extrae cada línea y la recalcula con la tarifa.
   - La columna de referencia de las facturas (p. ej. "336", "1873") parece ser el
     **número de albarán de Mimper**. Así cada coste real de transporte se puede asociar
     a su **albarán o pedido en Sage** y calcular el **margen real por pedido y por
     cliente** (venta − coste del producto − transporte real).
   - Las líneas mal cobradas generan la reclamación a Jovitrans, que se **envía sola**
     cuando la diferencia está clara (tarifa vigente cargada y datos completos).
   - Las facturas se leen solas desde el buzón; nadie tiene que subirlas.
3. **Informe mensual:** coste de transporte por cliente y por zona, clientes donde el
   transporte se come el margen y propuesta de importe mínimo para portes pagados.

## Qué necesitamos de Mimper para conectar

### Pipedrive
- [ ] Plan contratado (Essential / Advanced / Professional / Power / Enterprise).
      Las **plantillas de documentos (Smart Docs)** solo están en algunos planes; si no lo
      tienen, el PDF lo genera Colmena y no pasa nada.
- [ ] Un usuario administrador que genere un **API token** (Configuración personal → API),
      o mejor, autorizar una app OAuth de Colmena.
- [ ] Sus **embudos y etapas** actuales (para crear o reutilizar "Pedir presupuesto",
      "Listo para revisar", "Enviado", "Ganado/Perdido").
- [ ] Si los productos ya están dados de alta en Pipedrive o solo en Sage.

### Sage 200
- [ ] **Versión exacta:** Sage 200 (instalado en su servidor) o Sage 200 cloud (en la nube
      de Sage/Azure). Esto lo cambia todo.
- [ ] **Datos de contacto de su partner o implantador de Sage.** Es quien puede dar acceso
      a la API o a la base de datos y conoce sus personalizaciones.
- [ ] Forma de acceso, de mejor a peor:
  1. **API oficial o web services de Sage 200**, si su versión y su licencia la incluyen.
  2. **Acceso de solo lectura a la base de datos SQL Server** para clientes, artículos,
     tarifas y stock, más **importación** de ofertas y pedidos con las herramientas de
     Sage (o escritura vía el partner).
  3. Como mínimo: **exportaciones automáticas diarias** (Excel/CSV) de clientes,
     artículos y tarifas a una carpeta.
- [ ] Si usan **ofertas/presupuestos** en Sage o solo pedidos y albaranes.
- [ ] Si Sage está en un servidor de su oficina: permiso para instalar un **pequeño
      conector seguro** (un servicio que solo habla con Colmena, cifrado) o un acceso VPN.

### Resto
- [ ] Buzón de email donde llegan las peticiones de presupuesto (Outlook/M365 o Gmail).
- [ ] Buzón donde llegan las facturas de Jovitrans.
- [ ] Plantilla de presupuesto (logo, textos, condiciones).

## Fases propuestas

| Fase | Qué se entrega | Depende de |
|---|---|---|
| 1 | Motor de transporte Jovitrans + auditoría de facturas | Nada (ya tenemos tarifa y facturas) |
| 2 | Conexión con Pipedrive: presupuesto automático en el deal (productos, PDF, nota, actividad) usando una lista de precios exportada de Sage | API token de Pipedrive + export de artículos y clientes |
| 3 | Conexión en vivo con Sage 200: precios, descuentos y stock en tiempo real; oferta y pedido creados en Sage | Acceso a Sage (partner) |
| 4 | Agentes de seguimiento, margen real por pedido (transporte asociado a albarán) e informe semanal | Fases 1–3 |

La fase 1 y buena parte de la 2 se pueden empezar **ya**, sin esperar al acceso a Sage.

## ¿Y Base44?

Base44 sirve para hacer apps con su propia base de datos, por eso acaba pareciendo un
CRM. Para este proyecto **no es la herramienta adecuada como núcleo**: conectarse a un
Sage 200 instalado en el servidor de Mimper y escuchar webhooks de Pipedrive con lógica
fiable se hace mejor en código propio (este repositorio, que ya tiene Vercel, Supabase y
agentes de IA). Como mucho se podría usar Base44 para un panel interno, pero no es
necesario.

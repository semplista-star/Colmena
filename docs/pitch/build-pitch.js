const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");

// Paleta de marca Colmena (web azul/gris)
const C = {
  navy: "1C2733",
  navy2: "26344A",
  blue: "1F5FD1",
  sky: "3A8FDB",
  ice: "D6E4F7",
  gray: "EEF2F6",
  line: "D2DAE4",
  text: "1C2733",
  dim: "5B6B7D",
  white: "FFFFFF",
};
const HEAD = "Arial";
const BODY = "Calibri";

async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// Motivo: hexágono (celda de colmena) con icono dentro
function hexIcon(slide, img, x, y, d, fill) {
  slide.addShape("hexagon", { x, y, w: d, h: d * 0.88, fill: { color: fill }, line: { color: fill } });
  const s = d * 0.46;
  slide.addImage({ data: img, x: x + (d - s) / 2, y: y + (d * 0.88 - s) / 2, w: s, h: s });
}

function title(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.6, y: 0.4, w: 8.8, h: 0.75, fontFace: HEAD, fontSize: 28, bold: true,
    color: opts.color ?? C.text, margin: 0, isTextBox: true, valign: "top",
  });
}
function kicker(slide, text, color = C.blue) {
  slide.addText(text.toUpperCase(), {
    x: 0.6, y: 0.18, w: 8.8, h: 0.25, fontFace: BODY, fontSize: 10.5, bold: true,
    color, charSpacing: 2, margin: 0, isTextBox: true,
  });
}
function footer(slide, n, dark = false) {
  slide.addText(`Colmena × Mimper Spain   ${n}`, {
    x: 6.4, y: 5.25, w: 3.0, h: 0.25, fontFace: BODY, fontSize: 9, align: "right",
    color: dark ? "8FA3BD" : C.dim, margin: 0, isTextBox: true,
  });
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.title = "Colmena × Mimper Spain";
  pres.company = "Colmena";

  const I = {
    drafting: await icon(fa.FaDraftingCompass, C.white),
    tools: await icon(fa.FaTools, C.white),
    building: await icon(fa.FaBuilding, C.white),
    home: await icon(fa.FaHome, C.white),
    search: await icon(fa.FaSearch, C.white),
    bullseye: await icon(fa.FaBullseye, C.white),
    envelope: await icon(fa.FaEnvelopeOpenText, C.white),
    calendar: await icon(fa.FaCalendarCheck, C.white),
    brain: await icon(fa.FaBrain, C.white),
    ad: await icon(fa.FaAd, C.white),
    chart: await icon(fa.FaChartLine, C.white),
    pen: await icon(fa.FaPenNib, C.white),
    handshake: await icon(fa.FaHandshake, C.white),
    key: await icon(fa.FaKey, C.white),
    network: await icon(fa.FaProjectDiagram, C.white),
    rocket: await icon(fa.FaRocket, C.white),
    check: await icon(fa.FaCheck, C.blue),
    clock: await icon(fa.FaClock, C.dim),
    shield: await icon(fa.FaShieldAlt, C.white),
  };

  // 1 — Portada
  {
    const s = pres.addSlide();
    s.background = { color: C.navy };
    // panal decorativo a la derecha
    const cells = [[6.9, 0.6], [8.05, 0.6], [6.33, 1.62], [7.48, 1.62], [8.63, 1.62], [6.9, 2.64], [8.05, 2.64], [7.48, 3.66]];
    cells.forEach(([x, y], i) => {
      const fill = i === 3 ? C.blue : i === 6 ? C.sky : C.navy2;
      s.addShape("hexagon", { x, y, w: 1.1, h: 0.97, fill: { color: fill }, line: { color: fill } });
    });
    s.addText("COLMENA  ×  MIMPER SPAIN", { x: 0.6, y: 0.9, w: 5.6, h: 0.3, fontFace: BODY, fontSize: 12, bold: true, color: C.sky, charSpacing: 3, margin: 0, isTextBox: true });
    s.addText("Más obras para el poliuretano líquido de Mimper", { x: 0.6, y: 1.35, w: 5.6, h: 1.7, fontFace: HEAD, fontSize: 34, bold: true, color: C.white, margin: 0, isTextBox: true, valign: "top" });
    s.addText("25 agentes de IA que encuentran arquitectos, aplicadores y propiedades que necesitan impermeabilizar, les escriben y te traen la reunión agendada.", { x: 0.6, y: 3.2, w: 5.4, h: 0.9, fontFace: BODY, fontSize: 15, color: "C3D0E0", margin: 0, isTextBox: true, valign: "top" });
    s.addText("colmenalife.com  ·  Septiembre 2026", { x: 0.6, y: 4.85, w: 5, h: 0.3, fontFace: BODY, fontSize: 11, color: "8FA3BD", margin: 0, isTextBox: true });
    s.addNotes("Abrir agradeciendo el tiempo. Mensaje central: Mimper tiene un producto excelente y una red de aplicadores; Colmena pone en marcha la captación de forma continua para que ese producto llegue a más obras.");
  }

  // 2 — Mimper hoy
  {
    const s = pres.addSlide();
    s.background = { color: C.white };
    kicker(s, "Punto de partida");
    title(s, "Mimper ya tiene lo más difícil: producto y red");
    const stats = [
      ["+20", "años distribuyendo poliuretano líquido en España"],
      ["25", "años de garantía en sus sistemas"],
      ["MARIS", "distribuidor oficial de la marca de Saint-Gobain"],
      ["Red", "nacional de aplicadores certificados por Mimper"],
    ];
    stats.forEach(([big, label], i) => {
      const x = 0.6 + i * 2.25;
      s.addShape("roundRect", { x, y: 1.55, w: 2.05, h: 2.3, fill: { color: C.gray }, line: { color: C.gray }, rectRadius: 0.08 });
      s.addText(big, { x: x + 0.2, y: 1.8, w: 1.7, h: 0.8, fontFace: HEAD, fontSize: big.length > 3 ? 30 : 44, bold: true, color: C.blue, margin: 0, isTextBox: true, valign: "middle" });
      s.addText(label, { x: x + 0.2, y: 2.7, w: 1.7, h: 1.0, fontFace: BODY, fontSize: 13, color: C.text, margin: 0, isTextBox: true, valign: "top" });
    });
    s.addText("La pregunta no es si el producto es bueno, sino cuántos arquitectos, constructoras y comunidades lo conocen antes de decidir la impermeabilización.", {
      x: 0.6, y: 4.2, w: 8.8, h: 0.7, fontFace: BODY, fontSize: 15, italic: true, color: C.dim, margin: 0, isTextBox: true,
    });
    footer(s, 2);
    s.addNotes("Datos públicos de mimper.es: más de 20 años, garantía de 25 años, distribuidor oficial MARIS Saint-Gobain desde 2021 como Mimper Spain, red de aplicadores certificados. Confirmar cifras con ellos en la reunión.");
  }

  // 3 — El reto: cuatro públicos
  {
    const s = pres.addSlide();
    s.background = { color: C.gray };
    kicker(s, "El reto comercial");
    title(s, "Cuatro públicos, un solo equipo comercial");
    const cards = [
      [I.drafting, "Arquitectos y prescriptores", "Deciden el sistema en el proyecto. Hay que estar en su cabeza meses antes de la obra."],
      [I.tools, "Aplicadores", "Captar y certificar nuevos aplicadores amplía la red y el volumen de producto."],
      [I.building, "Constructoras y fincas", "Constructoras y administradores de fincas: rehabilitación de cubiertas y terrazas, compras grandes y recurrentes."],
      [I.home, "Particulares", "Buscan en Google cuando ya tienen la gotera. Hay que llevarlos al aplicador certificado de su zona."],
    ];
    cards.forEach(([img, h, p], i) => {
      const x = 0.6 + (i % 2) * 4.5;
      const y = 1.4 + Math.floor(i / 2) * 1.85;
      s.addShape("roundRect", { x, y, w: 4.2, h: 1.6, fill: { color: C.white }, line: { color: C.line }, rectRadius: 0.08 });
      hexIcon(s, img, x + 0.25, y + 0.3, 0.8, C.blue);
      s.addText(h, { x: x + 1.25, y: y + 0.22, w: 2.8, h: 0.4, fontFace: HEAD, fontSize: 14, bold: true, color: C.text, margin: 0, isTextBox: true, valign: "top" });
      s.addText(p, { x: x + 1.25, y: y + 0.62, w: 2.8, h: 0.85, fontFace: BODY, fontSize: 12, color: C.dim, margin: 0, isTextBox: true, valign: "top" });
    });
    footer(s, 3);
    s.addNotes("Cada público pide un mensaje, un canal y un momento distintos. Hacerlo a mano con un equipo pequeño obliga a elegir; Colmena permite trabajar los cuatro a la vez.");
  }

  // 4 — Qué es Colmena
  {
    const s = pres.addSlide();
    s.background = { color: C.white };
    kicker(s, "La solución");
    title(s, "Colmena: 25 agentes de IA, 5 departamentos");
    const depts = [
      [I.brain, "Inteligencia", "Analiza el mercado, define el cliente ideal y detecta señales de compra", "AG-01 a 05"],
      [I.envelope, "Prospección", "Escribe cada email, hace los seguimientos, contesta y agenda", "AG-06 a 10"],
      [I.ad, "Publicidad", "Campañas y anuncios en Meta y LinkedIn, pujas y píxel", "AG-11 a 15"],
      [I.chart, "Operaciones", "ROI, semáforo de campañas, CRM, cumplimiento RGPD e informes", "AG-16 a 20"],
      [I.pen, "Contenido", "SEO, Google Ads, newsletter, redes sociales y landings", "AG-21 a 25"],
    ];
    depts.forEach(([img, h, p, ids], i) => {
      const x = 0.6 + i * 1.8;
      hexIcon(s, img, x + 0.35, 1.45, 1.0, i % 2 ? C.sky : C.blue);
      s.addText(h, { x, y: 2.5, w: 1.7, h: 0.35, fontFace: HEAD, fontSize: 14, bold: true, color: C.text, align: "center", margin: 0, isTextBox: true });
      s.addText(ids, { x, y: 2.85, w: 1.7, h: 0.25, fontFace: BODY, fontSize: 10, color: C.blue, bold: true, align: "center", margin: 0, isTextBox: true });
      s.addText(p, { x, y: 3.15, w: 1.7, h: 1.2, fontFace: BODY, fontSize: 11.5, color: C.dim, align: "center", margin: 0, isTextBox: true, valign: "top" });
    });
    s.addText("Un orquestador decide cada mañana qué agente actúa con cada contacto, y todo queda registrado en un panel.", {
      x: 0.6, y: 4.55, w: 8.8, h: 0.4, fontFace: BODY, fontSize: 14, color: C.text, margin: 0, isTextBox: true,
    });
    footer(s, 4);
    s.addNotes("No es un chatbot: es un equipo comercial automatizado. Cada agente tiene una tarea concreta y el orquestador los coordina.");
  }

  // 5 — Cómo funciona
  {
    const s = pres.addSlide();
    s.background = { color: C.navy };
    kicker(s, "Cómo funciona", C.sky);
    title(s, "De la web de Mimper a la reunión agendada", { color: C.white });
    const steps = [
      [I.search, "1. Analiza", "Lee mimper.es y define los segmentos de cliente ideal con su nivel de encaje."],
      [I.bullseye, "2. Encuentra", "Localiza a las personas concretas y verifica su email profesional."],
      [I.envelope, "3. Contacta", "Email personalizado y hasta 3 seguimientos. Contesta dudas y respeta las bajas."],
      [I.calendar, "4. Agenda", "Si hay interés, envía el enlace de calendario y la reunión aparece en tu agenda."],
    ];
    steps.forEach(([img, h, p], i) => {
      const x = 0.6 + i * 2.25;
      hexIcon(s, img, x, 1.55, 0.95, i === 3 ? C.sky : C.blue);
      if (i < 3) s.addShape("line", { x: x + 1.1, y: 1.97, w: 0.95, h: 0, line: { color: "4A5B73", width: 1.5, endArrowType: "triangle" } });
      s.addText(h, { x, y: 2.65, w: 2.0, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.white, margin: 0, isTextBox: true });
      s.addText(p, { x, y: 3.1, w: 2.0, h: 1.3, fontFace: BODY, fontSize: 12.5, color: "C3D0E0", margin: 0, isTextBox: true, valign: "top" });
    });
    hexIcon(s, I.shield, 0.6, 4.55, 0.45, C.navy2);
    s.addText("Cumplimiento RGPD integrado: cada email pasa un control antes de salir (vía de baja, frecuencia, datos sensibles).", {
      x: 1.2, y: 4.55, w: 8.2, h: 0.4, fontFace: BODY, fontSize: 12, color: "C3D0E0", margin: 0, isTextBox: true, valign: "middle",
    });
    footer(s, 5, true);
    s.addNotes("Si en la reunión hay pantalla, enseñar el panel en vivo: dar de alta mimper.es y ver los segmentos que propone.");
  }

  // 6 — Aplicado a Mimper
  {
    const s = pres.addSlide();
    s.background = { color: C.white };
    kicker(s, "Aplicado a Mimper");
    title(s, "Una campaña por público, en paralelo");
    const hdr = { bold: true, color: C.white, fill: { color: C.navy }, fontFace: BODY, fontSize: 12 };
    const cell = (t, extra = {}) => ({ text: t, options: { fontFace: BODY, fontSize: 11.5, color: C.text, valign: "middle", ...extra } });
    const rows = [
      [{ text: "Público", options: hdr }, { text: "Qué hace Colmena", options: hdr }, { text: "Canal", options: hdr }],
      [cell("Arquitectos y estudios", { bold: true }), cell("Detecta estudios con proyectos de rehabilitación y cubiertas; ofrece asesoramiento técnico y documentación del sistema"), cell("Email + LinkedIn")],
      [cell("Administradores de fincas", { bold: true }), cell("Campaña antes de la temporada de lluvias: rehabilitar terrazas con 25 años de garantía"), cell("Email + Meta")],
      [cell("Constructoras", { bold: true }), cell("Propuesta a jefes de obra y compras con referencias de obras similares"), cell("Email + LinkedIn")],
      [cell("Nuevos aplicadores", { bold: true }), cell("Invita a impermeabilizadores a certificarse con Mimper y entrar en la red"), cell("Email + Meta")],
      [cell("Particulares", { bold: true }), cell("SEO y Google Ads para «impermeabilizar terraza»; una landing por zona deriva al aplicador certificado"), cell("SEO + Google Ads")],
    ];
    s.addTable(rows, {
      x: 0.6, y: 1.35, w: 8.8, colW: [2.1, 5.0, 1.7], rowH: [0.36, 0.62, 0.52, 0.52, 0.52, 0.62],
      border: { type: "solid", color: C.line, pt: 0.75 }, fill: { color: C.white }, margin: [0.04, 0.1, 0.04, 0.1],
    });
    footer(s, 6);
    s.addNotes("Proponer empezar por uno o dos públicos en el piloto: arquitectos y administradores de fincas suelen tener el ciclo más claro. Preguntar a Mimper cuál le da más margen.");
  }

  // 7 — Ejemplo de email
  {
    const s = pres.addSlide();
    s.background = { color: C.gray };
    kicker(s, "Así escribe AG-06");
    title(s, "Un email pensado para cada persona");
    // tarjeta email
    s.addShape("roundRect", { x: 0.6, y: 1.35, w: 5.6, h: 3.55, fill: { color: C.white }, line: { color: C.line }, rectRadius: 0.08, shadow: { type: "outer", color: "000000", opacity: 0.08, blur: 6, offset: 2, angle: 90 } });
    s.addText([
      { text: "Para: ", options: { color: C.dim } }, { text: "Laura, arquitecta · estudio de rehabilitación", options: { breakLine: true } },
      { text: "Asunto: ", options: { color: C.dim } }, { text: "La cubierta del proyecto de la calle Mallorca", options: { bold: true } },
    ], { x: 0.85, y: 1.5, w: 5.1, h: 0.6, fontFace: BODY, fontSize: 11.5, color: C.text, margin: 0, isTextBox: true, valign: "top" });
    s.addShape("line", { x: 0.85, y: 2.2, w: 5.1, h: 0, line: { color: C.line, width: 0.75 } });
    s.addText("Hola Laura: he visto que vuestro estudio lleva la rehabilitación del edificio de la calle Mallorca. En cubiertas transitables como esa, el poliuretano líquido evita juntas y solapes, que es donde suelen empezar las filtraciones, y lo respaldamos con 25 años de garantía.\n\n¿Te sería útil que te enviemos la ficha técnica y un detalle constructivo para la memoria del proyecto?", {
      x: 0.85, y: 2.3, w: 5.1, h: 2.45, fontFace: BODY, fontSize: 12, color: C.text, margin: 0, isTextBox: true, valign: "top", paraSpaceAfter: 4,
    });
    const points = [
      ["Personalizado", "Menciona algo real de la persona o su obra."],
      ["Pregunta fácil", "Pide algo pequeño, no una reunión de entrada."],
      ["Seguimiento solo", "Si no contesta, hasta 3 recordatorios espaciados."],
      ["Baja respetada", "Si pide que no le escribamos, no vuelve a recibir nada."],
    ];
    points.forEach(([h, p], i) => {
      const y = 1.4 + i * 0.88;
      s.addImage({ data: I.check, x: 6.55, y: y + 0.04, w: 0.22, h: 0.22 });
      s.addText(h, { x: 6.9, y, w: 2.6, h: 0.3, fontFace: HEAD, fontSize: 13, bold: true, color: C.text, margin: 0, isTextBox: true });
      s.addText(p, { x: 6.9, y: y + 0.3, w: 2.6, h: 0.5, fontFace: BODY, fontSize: 11.5, color: C.dim, margin: 0, isTextBox: true, valign: "top" });
    });
    s.addText("Ejemplo ilustrativo: persona y obra ficticias.", { x: 0.6, y: 5.0, w: 5, h: 0.22, fontFace: BODY, fontSize: 9, italic: true, color: C.dim, margin: 0, isTextBox: true });
    footer(s, 7);
    s.addNotes("El texto real lo genera la IA con los datos de cada contacto. Se puede ajustar el tono de Mimper y revisar los primeros envíos antes de automatizar.");
  }

  // 8 — Qué funciona hoy
  {
    const s = pres.addSlide();
    s.background = { color: C.white };
    kicker(s, "Transparencia");
    title(s, "Qué funciona hoy y qué estamos conectando");
    s.addShape("roundRect", { x: 0.6, y: 1.35, w: 4.25, h: 3.6, fill: { color: C.ice }, line: { color: C.ice }, rectRadius: 0.08 });
    s.addShape("roundRect", { x: 5.15, y: 1.35, w: 4.25, h: 3.6, fill: { color: C.gray }, line: { color: C.gray }, rectRadius: 0.08 });
    s.addText("En marcha", { x: 0.85, y: 1.55, w: 3.8, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.blue, margin: 0, isTextBox: true });
    s.addText("En integración", { x: 5.4, y: 1.55, w: 3.8, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.dim, margin: 0, isTextBox: true });
    const live = ["Análisis de la web y segmentos de cliente ideal", "Búsqueda y verificación de emails", "Emails personalizados y seguimientos automáticos", "Clasificación y respuesta de contestaciones", "Enlace de agenda y confirmación de reuniones", "Landings por segmento, planes de anuncios, SEO y contenidos", "Panel con el historial de cada contacto"];
    const soon = ["Publicación automática en Meta, LinkedIn y Google Ads (hoy se entrega el plan listo para lanzar)", "Sincronización con el CRM de Mimper", "Señales de compra automáticas (licencias, noticias)"];
    const list = (items) => items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } }));
    s.addText(list(live), { x: 0.85, y: 2.05, w: 3.8, h: 2.8, fontFace: BODY, fontSize: 11.5, color: C.text, margin: 0, isTextBox: true, valign: "top", paraSpaceAfter: 5 });
    s.addText(list(soon), { x: 5.4, y: 2.05, w: 3.8, h: 2.8, fontFace: BODY, fontSize: 12.5, color: C.text, margin: 0, isTextBox: true, valign: "top", paraSpaceAfter: 5 });
    footer(s, 8);
    s.addNotes("Ser honestos genera confianza: lo que está en integración depende de permisos de Meta, LinkedIn y Google que tardan semanas. Mientras tanto el plan de campaña se entrega listo para lanzarlo a mano.");
  }

  // 9 — Tres formas de trabajar juntos
  {
    const s = pres.addSlide();
    s.background = { color: C.gray };
    kicker(s, "Propuesta");
    title(s, "Tres formas de trabajar juntos");
    const opts = [
      [I.key, "Cliente", "Mimper usa Colmena para su propia captación.", ["Licencia anual: 3.000 €", "o semestral: 1.500 €", "Sin permanencia tras el periodo"], C.blue],
      [I.network, "Socio de distribución", "Mimper ofrece Colmena a su red de aplicadores certificados.", ["Cada aplicador recibe más obras", "Más obras = más membrana Mimper", "Condiciones para la red a acordar"], C.sky],
      [I.handshake, "Socio estratégico", "Mimper entra en el proyecto como inversor o socio sectorial.", ["Colmena especializada en construcción", "Mimper como caso de referencia", "Estructura a definir juntos"], C.navy],
    ];
    opts.forEach(([img, h, p, bullets, color], i) => {
      const x = 0.6 + i * 3.0;
      s.addShape("roundRect", { x, y: 1.35, w: 2.8, h: 3.6, fill: { color: C.white }, line: { color: C.line }, rectRadius: 0.08 });
      hexIcon(s, img, x + 0.25, 1.6, 0.75, color);
      s.addText(h, { x: x + 0.25, y: 2.4, w: 2.35, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.text, margin: 0, isTextBox: true });
      s.addText(p, { x: x + 0.25, y: 2.8, w: 2.35, h: 0.7, fontFace: BODY, fontSize: 12, color: C.dim, margin: 0, isTextBox: true, valign: "top" });
      s.addText(bullets.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < bullets.length - 1 } })), {
        x: x + 0.25, y: 3.55, w: 2.35, h: 1.25, fontFace: BODY, fontSize: 11.5, color: C.text, margin: 0, isTextBox: true, valign: "top", paraSpaceAfter: 3,
      });
    });
    footer(s, 9);
    s.addNotes("No hay que elegir una sola: lo natural es empezar como cliente con un piloto y, si funciona, extenderlo a la red de aplicadores. La opción de socio estratégico se abre si Mimper ve el potencial en el sector.");
  }

  // 10 — Piloto 90 días
  {
    const s = pres.addSlide();
    s.background = { color: C.white };
    kicker(s, "Siguiente paso");
    title(s, "Piloto de 90 días");
    const phases = [
      ["Semanas 1–2", "Puesta en marcha", "Dominio de envío, tono de Mimper, elegir 2 públicos y cargar los primeros contactos."],
      ["Semanas 3–8", "Campañas en marcha", "Envíos diarios crecientes, seguimientos y reuniones agendadas en la agenda de Mimper."],
      ["Semanas 9–12", "Medir y decidir", "Informe de resultados: qué público responde mejor y si ampliar a la red de aplicadores."],
    ];
    s.addShape("line", { x: 0.9, y: 1.92, w: 8.2, h: 0, line: { color: C.line, width: 2 } });
    phases.forEach(([when, h, p], i) => {
      const x = 0.6 + i * 3.0;
      s.addShape("hexagon", { x: x + 0.05, y: 1.67, w: 0.55, h: 0.5, fill: { color: i === 2 ? C.sky : C.blue }, line: { color: C.white, width: 2 } });
      s.addText(String(i + 1), { x: x + 0.05, y: 1.67, w: 0.55, h: 0.5, fontFace: HEAD, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
      s.addText(when, { x, y: 2.35, w: 2.7, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: C.blue, margin: 0, isTextBox: true });
      s.addText(h, { x, y: 2.65, w: 2.7, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.text, margin: 0, isTextBox: true });
      s.addText(p, { x, y: 3.05, w: 2.7, h: 0.9, fontFace: BODY, fontSize: 12, color: C.dim, margin: 0, isTextBox: true, valign: "top" });
    });
    s.addShape("roundRect", { x: 0.6, y: 4.2, w: 8.8, h: 0.75, fill: { color: C.gray }, line: { color: C.gray }, rectRadius: 0.08 });
    s.addText([
      { text: "Lo que mediremos: ", options: { bold: true, color: C.text } },
      { text: "contactos alcanzados, tasa de respuesta, reuniones agendadas y coste por reunión frente al método actual de Mimper.", options: { color: C.dim } },
    ], { x: 0.85, y: 4.2, w: 8.3, h: 0.75, fontFace: BODY, fontSize: 13, margin: 0, isTextBox: true, valign: "middle" });
    footer(s, 10);
    s.addNotes("Pedir en la reunión: qué público priorizar, quién de Mimper recibe las reuniones y acceso al DNS para configurar el dominio de envío.");
  }

  // 11 — Cierre
  {
    const s = pres.addSlide();
    s.background = { color: C.navy };
    const cells = [[7.2, 0.5], [8.35, 0.5], [7.78, 1.52]];
    cells.forEach(([x, y], i) => s.addShape("hexagon", { x, y, w: 1.1, h: 0.97, fill: { color: i === 2 ? C.blue : C.navy2 }, line: { color: i === 2 ? C.blue : C.navy2 } }));
    s.addText("¿Empezamos por un público?", { x: 0.6, y: 1.2, w: 6.4, h: 1.3, fontFace: HEAD, fontSize: 32, bold: true, color: C.white, margin: 0, isTextBox: true, valign: "top" });
    s.addText("Elegimos juntos arquitectos, administradores de fincas o nuevos aplicadores, y en dos semanas Colmena está trabajando para Mimper.", { x: 0.6, y: 2.25, w: 6.0, h: 1.0, fontFace: BODY, fontSize: 16, color: "C3D0E0", margin: 0, isTextBox: true, valign: "top" });
    hexIcon(s, I.rocket, 0.6, 4.05, 0.7, C.blue);
    s.addText("colmenalife.com", { x: 1.5, y: 4.1, w: 5, h: 0.55, fontFace: HEAD, fontSize: 20, bold: true, color: C.white, margin: 0, isTextBox: true, valign: "middle" });
    s.addNotes("Cerrar con una pregunta concreta, no con 'preguntas'. Proponer fecha para la sesión de puesta en marcha.");
  }

  await pres.writeFile({ fileName: "Colmena_x_Mimper.pptx" });
  console.log("ok");
})();

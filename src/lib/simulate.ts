// Generadores de datos deterministas para los agentes que aún no tienen una
// API externa conectada (Apollo, Resend, LinkedIn, Cal.com, HubSpot...).
// Mismo input -> mismo output, para poder probar el flujo end-to-end sin
// depender de un servicio real ni de aleatoriedad que rompa los tests.

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const DIACRITICS = /[̀-ͯ]/g;

export function slugifyEmailPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "") // quita acentos tras normalizar NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

import type { CanalNormalizado } from "@/types";

/** Decodifica %XX en UTMs (espacios, acentos). No lanza. */
function safeDecodeUtm(s: string): string {
  const t = (s ?? "").trim();
  if (!t || !t.includes("%")) return t;
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

/** Normaliza texto para comparación: decode, minúsculas, espacios colapsados. */
function normalizeForMatch(s: string): string {
  const decoded = safeDecodeUtm(s ?? "");
  return decoded
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Comprueba si el texto contiene alguna de las palabras clave.
 * Las keywords se comparan normalizadas (sin espacios extra, case-insensitive).
 */
function matchesKeyword(normalizedText: string, keywords: string[]): boolean {
  const textNoSpaces = normalizedText.replace(/\s/g, "");
  return keywords.some((k) => {
    const kw = normalizeForMatch(k);
    if (!kw.length) return false;
    const kwNoSpaces = kw.replace(/\s/g, "");
    return normalizedText.includes(kw) || textNoSpaces.includes(kwNoSpaces);
  });
}

/**
 * Reglas de canal (orden = prioridad).
 * Si la UTM tiene varios canales, se asigna el de mayor prioridad (el primero que matchee).
 * 1. Tienda online 2. Redes sociales 3. Marketplace 4. Tienda física 5. No vendo 6. Venden 7. No sabemos (restantes)
 */
const CANAL_RULES: { canal: CanalNormalizado; keywords: string[] }[] = [
  {
    canal: "tienda-online",
    keywords: ["online", "tiendaonline", "loja virtual", "virtual", "lojavirtual"],
  },
  {
    canal: "redes-sociales",
    keywords: [
      "rrss",
      "redes",
      "some",
      "socialmedia",
      "redes-sociales",
      "redes sociais",
      "sociais",
    ],
  },
  {
    canal: "marketplace",
    keywords: ["marketplace", "mktplace", "isr"],
  },
  {
    canal: "tienda-fisica",
    keywords: [
      "loja física",
      "física",
      "fisica",
      "loja fisica",
      "lojafisica",
    ],
  },
  {
    canal: "no-vendo",
    keywords: [
      "noseller",
      "novendo",
      "novenden",
      "novende",
      "no vende",
      "no venden",
      "não vendo",
      "nao vendo",
    ],
  },
  {
    canal: "venden",
    keywords: [
      "vende",
      "venden",
      "venden gral",
      "vendengral",
      "venden gral",
      "fidelizacion",
      "fidelización",
    ],
  },
  {
    canal: "no-sabemos",
    keywords: ["nosabemos", "gral", "general"],
  },
];

export type CustomCanalMap = Record<string, CanalNormalizado>;

/**
 * Clasifica un texto (p. ej. utm_content + " " + utm_campaign) en uno de los canales.
 * Acepta mapeo custom: si la clave (normalizada) está en customCanal, se usa ese canal.
 */
export function normalizarCanal(
  text: string,
  options?: { customCanal?: CustomCanalMap }
): CanalNormalizado {
  const raw = safeDecodeUtm((text ?? "").trim());
  const normalized = normalizeForMatch(raw);
  if (!normalized) return "no-sabemos";

  const custom = options?.customCanal;
  if (custom) {
    const key = Object.keys(custom).find(
      (k) => normalizeForMatch(k) === normalized || normalized.includes(normalizeForMatch(k))
    );
    if (key) return custom[key];
    const keyNoSpaces = normalized.replace(/\s/g, "");
    const keyByNoSpaces = Object.keys(custom).find(
      (k) => (k || "").trim().toLowerCase().replace(/\s/g, "") === keyNoSpaces
    );
    if (keyByNoSpaces) return custom[keyByNoSpaces];
  }

  for (const { canal, keywords } of CANAL_RULES) {
    if (matchesKeyword(normalized, keywords)) return canal;
  }

  return "no-sabemos";
}

/** Indica si el texto (ya normalizado) coincide con alguna keyword conocida de canal (sin custom). */
export function isKnownCanalKeyword(text: string): boolean {
  const normalized = normalizeForMatch(text);
  if (!normalized) return true;
  return CANAL_RULES.some(({ keywords }) => matchesKeyword(normalized, keywords));
}

/** Etiquetas para UI */
export const CANAL_LABELS: Record<CanalNormalizado, string> = {
  "tienda-online": "Tienda online",
  "redes-sociales": "Redes sociales",
  marketplace: "Marketplaces",
  "tienda-fisica": "Tienda física",
  "no-vendo": "No vendo",
  "no-sabemos": "No sabemos",
  venden: "Venden (no segmentado)",
};

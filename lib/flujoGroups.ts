/**
 * Agrupa utm_campaign en orígenes/flujos para las tablas Tableau.
 * Orden de prioridad: Flujos, Broadcast, Entrenamiento Nube, Eventos, Afiliados, Performance, Otros.
 */

function normalizeForMatch(s: string): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export type OrigenLabel =
  | "Flujos"
  | "Broadcast"
  | "Entrenamiento Nube"
  | "Eventos"
  | "Afiliados"
  | "Performance"
  | "Otros";

export type CustomOrigenMap = Record<string, OrigenLabel>;

const ORIGEN_RULES: { label: OrigenLabel; keywords: string[] }[] = [
  { label: "Flujos", keywords: ["flujos", "flujo", "fluxos"] },
  { label: "Broadcast", keywords: ["broadcast", "broadcasts"] },
  {
    label: "Entrenamiento Nube",
    keywords: [
      "webinar",
      "entrenamientonube",
      "entrenamientonubve",
      "isr",
      "enonline",
      "ctt",
      "regulacion",
      "regulación",
    ],
  },
  {
    label: "Eventos",
    keywords: ["events", "eventos", "event", "techweek", "tecnomoda", "intermoda", "innova"],
  },
  {
    label: "Afiliados",
    keywords: ["afiliados", "taller", "herproject", "alibaba"],
  },
  { label: "Performance", keywords: ["performance"] },
];

function matchesOrigen(normalizedCampaign: string, keywords: string[]): boolean {
  const campaignNoSpaces = normalizedCampaign.replace(/\s/g, "");
  return keywords.some((k) => {
    const kw = normalizeForMatch(k);
    const kwNoSpaces = kw.replace(/\s/g, "");
    return (
      normalizedCampaign.includes(kw) ||
      campaignNoSpaces.includes(kwNoSpaces)
    );
  });
}

/**
 * Devuelve el grupo/origen de una campaña (utm_campaign).
 * Si se pasa customOrigen y la campaña (o su versión normalizada) está en el mapa, se usa ese valor.
 */
export function campaignToFlujoGroup(
  campaign: string,
  options?: { customOrigen?: CustomOrigenMap }
): OrigenLabel | string {
  const raw = (campaign ?? "").trim();
  const normalized = normalizeForMatch(raw);
  if (!normalized) return "Otros";

  const custom = options?.customOrigen;
  if (custom) {
    const key = Object.keys(custom).find(
      (k) =>
        normalizeForMatch(k) === normalized ||
        normalized.includes(normalizeForMatch(k)) ||
        normalizeForMatch(k).includes(normalized)
    );
    if (key) return custom[key];
    const keyNoSpaces = normalized.replace(/\s/g, "");
    const keyByNoSpaces = Object.keys(custom).find(
      (k) => (k || "").trim().toLowerCase().replace(/\s/g, "") === keyNoSpaces
    );
    if (keyByNoSpaces) return custom[keyByNoSpaces];
  }

  for (const { label, keywords } of ORIGEN_RULES) {
    if (matchesOrigen(normalized, keywords)) return label;
  }

  return "Otros";
}

export const ORIGEN_LABELS: OrigenLabel[] = [
  "Flujos",
  "Broadcast",
  "Entrenamiento Nube",
  "Eventos",
  "Afiliados",
  "Performance",
];

/** Indica si la campaña coincide con alguna regla conocida (sin custom). */
export function isKnownOrigen(campaign: string): boolean {
  const normalized = normalizeForMatch(campaign);
  if (!normalized) return true;
  return ORIGEN_RULES.some(({ keywords }) => matchesOrigen(normalized, keywords));
}

/**
 * Agrupa utm_campaign en flujos para las tablas Tableau.
 * "Flujo" → Flujos. "Online" y "webinar" (salvo flujo/tienda online) → Entrenamiento Nube.
 */
const FLUJO_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bflujo\b/i, label: "Flujos" },
  { pattern: /^broadcast$/i, label: "Broadcast" },
  { pattern: /entrenamientonube|entrenamiento|webinar/i, label: "Entrenamiento Nube" },
  { pattern: /afiliados|affiliate/i, label: "Afiliados" },
];

export function campaignToFlujoGroup(campaign: string): string {
  const s = (campaign ?? "").trim().toLowerCase();
  if (!s) return "Otros";

  if (s.includes("online") && !s.includes("tienda") && !s.includes("flujo")) {
    return "Entrenamiento Nube";
  }

  for (const { pattern, label } of FLUJO_PATTERNS) {
    if (pattern.test(s)) return label;
  }

  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "Otros";
}
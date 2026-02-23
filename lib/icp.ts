import type { CanalNormalizado } from "@/types";

/**
 * Reglas ICP: clasifica utm_content (o string con canales) en uno de 7 canales.
 * Prioridad: ICP1 tienda online > ICP2 redes > ICP3 marketplace > ICP4 tienda física > ICP5 no vendo > ICP6 venden (flujos no segmentados) > ICP7 no sabemos.
 * Variantes reales: online, rrss, mktplace, fisica/físico, venden.
 */
const PATRONES: { canal: CanalNormalizado; keywords: string[] }[] = [
  { canal: "tienda-online", keywords: ["tiendaonline", "tienda-online", "tienda online", "online"] },
  { canal: "redes-sociales", keywords: ["redes", "redes sociales", "redessociales", "rrss"] },
  { canal: "marketplace", keywords: ["marketplace", "market place", "mktplace"] },
  { canal: "tienda-fisica", keywords: ["tiendafisica", "tienda fisica", "tienda física", "fisica", "física", "fisico", "físico"] },
  { canal: "no-vendo", keywords: ["no vendo", "novendo", "no venden", "nosabemos", "no sabemos", "nosabemos"] },
  { canal: "venden", keywords: ["venden", "seller", "selller", "consejos-venden", "inactividad-venden", "fidelizacion-venden"] },
  { canal: "no-sabemos", keywords: ["faltante", "n/a", "na", ""] },
];

export function normalizarCanal(utmContent: string): CanalNormalizado {
  const raw = (utmContent ?? "").trim();
  const lower = raw.toLowerCase();
  if (!lower) return "no-sabemos";

  // ICP1: tienda online
  if (matches(lower, PATRONES[0].keywords)) return "tienda-online";
  // ICP2: redes
  if (matches(lower, PATRONES[1].keywords)) return "redes-sociales";
  // ICP3: marketplace
  if (matches(lower, PATRONES[2].keywords)) return "marketplace";
  // ICP4: tienda física
  if (matches(lower, PATRONES[3].keywords)) return "tienda-fisica";
  // ICP5: no vendo (explícito)
  if (matches(lower, ["no vendo", "novendo", "no venden", "nosabemos", "no sabemos"])) return "no-vendo";
  // ICP6: venden (flujos no segmentados; no debe matchear "no vendo")
  if (matches(lower, ["venden", "consejos-venden", "inactividad-venden", "fidelizacion-venden", "seller", "selller"])) return "venden";
  if (matches(lower, PATRONES[5].keywords)) return "no-sabemos";

  return "no-sabemos";
}

function matches(text: string, keywords: string[]): boolean {
  return keywords.some((k) => k && text.includes(k.toLowerCase()));
}

/** Etiquetas para UI */
export const CANAL_LABELS: Record<CanalNormalizado, string> = {
  "tienda-online": "Tienda online",
  "redes-sociales": "Redes sociales",
  marketplace: "Marketplace",
  "tienda-fisica": "Tienda física",
  "no-vendo": "No vendo",
  "no-sabemos": "No sabemos",
  venden: "Venden general",
};

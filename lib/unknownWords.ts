import type { FilaTableau } from "@/types";
import type { CustomCanalMap } from "./icp";
import type { CustomOrigenMap } from "./flujoGroups";
import { normalizarCanal } from "./icp";
import { campaignToFlujoGroup } from "./flujoGroups";

/** Palabras que catalogamos explícitamente como "no sabemos"; no deben aparecer como no reconocidas. */
const NO_SABEMOS_KEYWORDS = ["nosabemos", "gral", "general"];

function isIntentionalNoSabemos(text: string): boolean {
  const t = (text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return true;
  return NO_SABEMOS_KEYWORDS.some((k) => t.includes(k) || t.replace(/\s/g, "").includes(k.replace(/\s/g, "")));
}

/**
 * Extrae valores que se clasificaron como "No sabemos" (canal) o "Otros" (origen)
 * para mostrarlos al usuario y permitir asignarlos manualmente.
 * Excluye los que ya están en los mapeos custom.
 */
export function getUnknownWords(
  trialsData: FilaTableau[],
  newPaymentsData: FilaTableau[],
  customCanal?: CustomCanalMap,
  customOrigen?: CustomOrigenMap
): { unknownCanal: string[]; unknownOrigen: string[] } {
  const combinedCanalSet = new Set<string>();
  const campaignSet = new Set<string>();

  const allRows = [...trialsData, ...newPaymentsData];
  for (const r of allRows) {
    const combined = [(r.utm_content || "").trim(), (r.utm_campaign || "").trim()]
      .filter(Boolean)
      .join(" ");
    if (combined) combinedCanalSet.add(combined);
    const camp = (r.utm_campaign || "").trim();
    if (camp) campaignSet.add(camp);
  }

  const unknownCanal: string[] = [];
  for (const text of Array.from(combinedCanalSet)) {
    if (!text.trim()) continue;
    const canalSinCustom = normalizarCanal(text);
    if (canalSinCustom !== "no-sabemos") continue;
    if (isIntentionalNoSabemos(text)) continue;
    const yaMapeado =
      customCanal &&
      Object.keys(customCanal).some(
        (k) =>
          k.trim().toLowerCase() === text.trim().toLowerCase() ||
          text.trim().toLowerCase().includes(k.trim().toLowerCase())
      );
    if (!yaMapeado) unknownCanal.push(text);
  }

  const unknownOrigen: string[] = [];
  for (const campaign of Array.from(campaignSet)) {
    const grupoSinCustom = campaignToFlujoGroup(campaign);
    if (grupoSinCustom !== "Otros") continue;
    const yaMapeado =
      customOrigen &&
      Object.keys(customOrigen).some(
        (k) => k.trim().toLowerCase() === campaign.trim().toLowerCase()
      );
    if (!yaMapeado) unknownOrigen.push(campaign);
  }

  return {
    unknownCanal: [...new Set(unknownCanal)].sort(),
    unknownOrigen: [...new Set(unknownOrigen)].sort(),
  };
}

import type { FilaTableau, FilaHubSpot, FilaUnificada, CanalNormalizado, EtapaFunnel } from "@/types";
import { normalizarCanal } from "./icp";

function extractEtapa(utmContent: string): EtapaFunnel | undefined {
  const lower = (utmContent ?? "").toLowerCase();
  if (lower.includes("tofu")) return "tofu";
  if (lower.includes("mofu")) return "mofu";
  if (lower.includes("bofu")) return "bofu";
  return undefined;
}

/** Normaliza campaign/content para cruce: minúsculas, espacios → guión, decode %XX. */
export function normalizarParaCruce(s: string): string {
  if (!s) return "";
  try {
    const decoded = decodeURIComponent(String(s));
    return decoded
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/%2c/gi, ",")
      .replace(/%20/g, "-");
  } catch {
    return String(s).toLowerCase().trim().replace(/\s+/g, "-");
  }
}

/** Genera clave para agrupar: campaign normalizado + canal + etapa (para cruce entre fuentes). */
function key(campaign: string, canal: CanalNormalizado, etapa?: EtapaFunnel): string {
  const norm = normalizarParaCruce(campaign);
  return [norm || campaign, canal, etapa ?? ""].filter(Boolean).join("|");
}

/**
 * Une los 3 orígenes: trials, new payments y HubSpot.
 * Agrega por (utm_campaign, canal normalizado, etapa opcional).
 */
export function mergeData(
  trials: FilaTableau[],
  newPayments: FilaTableau[],
  hubspot: FilaHubSpot[]
): FilaUnificada[] {
  const map = new Map<string, FilaUnificada>();

  function addTableau(rows: FilaTableau[], field: "trials" | "new_payments") {
    for (const r of rows) {
      const canal = normalizarCanal(r.utm_content);
      const etapa = extractEtapa(r.utm_content);
      const k = key(r.utm_campaign || r.utm_content, canal, etapa);
      let row = map.get(k);
      if (!row) {
        row = {
          utm_campaign: r.utm_campaign,
          canal,
          etapa,
          trials: 0,
          new_payments: 0,
          sends: 0,
          opens: 0,
          clicks: 0,
          ctr: 0,
          spam: 0,
        };
        map.set(k, row);
      }
      if (field === "trials") row.trials += r.valor;
      else row.new_payments += r.valor;
    }
  }

  function addHubSpot(rows: FilaHubSpot[]) {
    for (const r of rows) {
      const canal = normalizarCanal(r.utm_content);
      const etapa = extractEtapa(r.utm_content);
      const k = key(r.utm_campaign || r.utm_content, canal, etapa);
      let row = map.get(k);
      if (!row) {
        row = {
          utm_campaign: r.utm_campaign,
          canal,
          etapa,
          trials: 0,
          new_payments: 0,
          sends: 0,
          opens: 0,
          clicks: 0,
          ctr: 0,
          spam: 0,
        };
        map.set(k, row);
      }
      row.sends += r.sends;
      row.opens += r.opens;
      row.clicks += r.clicks;
      row.ctr += r.ctr;
      row.spam += r.spam;
      if (r.delivered !== undefined) row.delivered = (row.delivered ?? 0) + r.delivered;
      if (r.unsubscribed !== undefined) row.unsubscribed = (row.unsubscribed ?? 0) + r.unsubscribed;
      if (r.omitted !== undefined) row.omitted = (row.omitted ?? 0) + r.omitted;
    }
  }

  addTableau(trials, "trials");
  addTableau(newPayments, "new_payments");
  addHubSpot(hubspot);

  return Array.from(map.values());
}

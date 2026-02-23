import type { FilaTableau, FilaHubSpot } from "@/types";
import { parseCSV, toNumber, findColumn } from "./csv";
import { extractUtmFromRow } from "./utm";

/** Colapsa artefacto UTF-16 leído como UTF-8 (e.g. "f l u j o" -> "flujo"). */
function collapseUtf16Artifact(s: string): string {
  const t = s.trim();
  if (/^([\w().%-]\s)+[\w().%-]$/.test(t)) return t.replace(/\s/g, "");
  return t;
}

const TRIALS_ALIASES = [
  "trials",
  "trial",
  "conversions_trial",
  "Trials Atribución Mean Click",
  "Trials Atribucion Mean Click",
  "Atribución Mean Click",
  "Atribucion Mean Click",
];
const NP_ALIASES = [
  "new_payments",
  "new payments",
  "np",
  "newpayments",
  "conversions_np",
  "Atribución NP Mean Click",
  "Atribucion NP Mean Click",
  "NP Atribución Mean Click",
  "NP Atribucion Mean Click",
];
const CAMPAIGN_ALIASES = ["utm_campaign", "utm campaign", "campaign"];
const CONTENT_ALIASES = ["utm_content", "utm content", "content"];
const SENDS_ALIASES = ["ENVIADOS", "enviados", "sends", "sent", "Sent"];
const OPENS_ALIASES = ["ABIERTOS", "Abiertos", "opens", "open", "opened", "Abierto"];
const CLICKS_ALIASES = ["CLICK", "Clicks", "clicks", "click", "Con clic"];
const CTR_ALIASES = ["ctr", "click rate", "Tasa de clics", "Tasa de clickthrough"];
const SPAM_ALIASES = ["spam", "spam reports", "Informes de spam"];
const DELIVERED_ALIASES = ["ENTREGADOS", "entregados", "delivered"];
const UNSUBSCRIBED_ALIASES = ["SUSCRIPCION CANCELADA", "Suscripcion cancelada", "unsubscribed"];
const OMITTED_ALIASES = ["OMITIDOS", "omitidos", "omitted", "skipped"];
const HUBSPOT_NOMBRE_CORREO = ["Nombre del correo", "Nombre del correo electrónico", "Email name"];

/** Parsea CSV de Tableau (trials o new payments): tab, cabeceras normalizables, campaign/content. */
export function parseTableauCSV(
  csvText: string,
  valueAliases: string[]
): FilaTableau[] {
  const rows = parseCSV(csvText, { delimiter: "\t", normalizeHeaders: true });
  const result: FilaTableau[] = [];

  for (const row of rows) {
    const campaignCol = findColumn(row, CAMPAIGN_ALIASES);
    const contentCol = findColumn(row, CONTENT_ALIASES);
    let utm_campaign = campaignCol ? String(row[campaignCol] ?? "").trim() : "";
    let utm_content = contentCol ? String(row[contentCol] ?? "").trim() : "";
    utm_campaign = collapseUtf16Artifact(utm_campaign);
    utm_content = collapseUtf16Artifact(utm_content);
    if (!utm_campaign && !utm_content) continue;

    const valorCol = findColumn(row, valueAliases);
    const valor = valorCol ? toNumber(row[valorCol]) : 0;
    result.push({ utm_campaign, utm_content, valor });
  }
  return result;
}

/** Extrae campaign y content desde "Nombre del correo" de HubSpot (ej. "Flujo tienda online- mofu1"). */
export function extractCampaignContentFromNombre(nombre: string): { campaign: string; content: string } {
  let s = (nombre ?? "").trim();
  const match = s.match(/(?:Flujo|flujo)\s+([^,]+)/i) || s.match(/(?:\[.*?\])?\s*(.+)/);
  const fragment = (match ? match[1] : s).trim();
  const normalized = fragment
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/–/g, "-")
    .replace(/,/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const campaign = normalized.split(/-?(?:tofu|mofu|bofu)/i)[0]?.replace(/-+$/, "") || normalized;
  const content = normalized;
  return { campaign: campaign || "hubspot", content: content || fragment };
}

/** Parsea CSV de HubSpot: columnas en español, campaign/content desde "Nombre del correo". */
export function parseHubSpotCSV(csvText: string): FilaHubSpot[] {
  const rows = parseCSV(csvText, { delimiter: "," });
  const result: FilaHubSpot[] = [];

  const nombreCol = findColumn(
    rows[0] ?? {},
    HUBSPOT_NOMBRE_CORREO
  );

  for (const row of rows) {
    let utm_campaign = "";
    let utm_content = "";

    if (nombreCol && row[nombreCol]) {
      const { campaign, content } = extractCampaignContentFromNombre(row[nombreCol]);
      utm_campaign = campaign;
      utm_content = content;
    }
    if (!utm_campaign && !utm_content) {
      const fromUtm = extractUtmFromRow(row);
      utm_campaign = fromUtm.utm_campaign;
      utm_content = fromUtm.utm_content;
    }
    if (!utm_campaign && !utm_content) continue;

    const nombreCorreo = nombreCol && row[nombreCol] ? String(row[nombreCol]).trim() : undefined;
    const sendsCol = findColumn(row, SENDS_ALIASES);
    const opensCol = findColumn(row, OPENS_ALIASES);
    const clicksCol = findColumn(row, CLICKS_ALIASES);
    const ctrCol = findColumn(row, CTR_ALIASES);
    const spamCol = findColumn(row, SPAM_ALIASES);
    const deliveredCol = findColumn(row, DELIVERED_ALIASES);
    const unsubscribedCol = findColumn(row, UNSUBSCRIBED_ALIASES);
    const omittedCol = findColumn(row, OMITTED_ALIASES);

    const sends = sendsCol ? toNumber(row[sendsCol]) : 0;
    const opens = opensCol ? toNumber(row[opensCol]) : 0;
    const clicks = clicksCol ? toNumber(row[clicksCol]) : 0;
    const ctr = ctrCol ? toNumber(row[ctrCol]) : 0;
    const spam = spamCol ? toNumber(row[spamCol]) : 0;
    const delivered = deliveredCol ? toNumber(row[deliveredCol]) : undefined;
    const unsubscribed = unsubscribedCol ? toNumber(row[unsubscribedCol]) : undefined;
    const omitted = omittedCol ? toNumber(row[omittedCol]) : undefined;

    result.push({
      utm_campaign,
      utm_content,
      ...(nombreCorreo && { nombre_correo: nombreCorreo }),
      sends,
      opens,
      clicks,
      ctr,
      spam,
      ...(delivered !== undefined && { delivered }),
      ...(unsubscribed !== undefined && { unsubscribed }),
      ...(omitted !== undefined && { omitted }),
    });
  }
  return result;
}

export function parseTrialsCSV(csvText: string): FilaTableau[] {
  return parseTableauCSV(csvText, TRIALS_ALIASES);
}

export function parseNewPaymentsCSV(csvText: string): FilaTableau[] {
  return parseTableauCSV(csvText, NP_ALIASES);
}

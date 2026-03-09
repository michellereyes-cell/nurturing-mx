"use client";

import type { FilaTableau, CanalNormalizado, EtapaFunnel } from "@/types";
import { CANAL_LABELS, normalizarCanal } from "@/lib/icp";
import type { CustomCanalMap } from "@/lib/icp";
import { campaignToFlujoGroup } from "@/lib/flujoGroups";
import type { CustomOrigenMap } from "@/lib/flujoGroups";
import { extractEtapa } from "@/lib/merge";

const CANALES_ORDER: CanalNormalizado[] = [
  "tienda-online",
  "redes-sociales",
  "marketplace",
  "tienda-fisica",
  "no-vendo",
  "venden",
  "no-sabemos",
];

const ETAPAS_ORDER: EtapaFunnel[] = ["tofu", "mofu", "bofu"];
const ETAPA_LABELS: Record<EtapaFunnel, string> = {
  tofu: "TOFU",
  mofu: "MOFU",
  bofu: "BOFU",
};

/** Extrae el canal desde utm_campaign cuando es flujo-canal (ej. "flujo-marketplace" → "marketplace"). */
function canalFromFlujoCampaign(
  utmCampaign: string,
  customCanal?: CustomCanalMap
): CanalNormalizado | null {
  const s = (utmCampaign ?? "").trim().toLowerCase();
  const match = s.match(/flujo[-_\s]+(.+)/);
  if (!match) return null;
  return normalizarCanal(match[1].trim(), { customCanal }) as CanalNormalizado;
}

/** Fila de la tabla: etapa + email (identificador desde utm_content). */
interface TableRow {
  etapa: EtapaFunnel;
  emailId: string;
  label: string;
  rowIndex: number;
}

interface FlujosConversionTableProps {
  trialsData?: FilaTableau[];
  newPaymentsData?: FilaTableau[];
  etapaFilter?: EtapaFunnel | "todas";
  customCanal?: CustomCanalMap;
  customOrigen?: CustomOrigenMap;
}

function buildFlujosMatrixFromRaw(
  trialsData: FilaTableau[],
  newPaymentsData: FilaTableau[],
  options?: { customCanal?: CustomCanalMap; customOrigen?: CustomOrigenMap }
): {
  rows: TableRow[];
  getTrials: (row: TableRow, canal: CanalNormalizado) => number;
  getNewPayments: (row: TableRow, canal: CanalNormalizado) => number;
} {
  const contentByEtapa = new Map<EtapaFunnel, Set<string>>();
  for (const e of ETAPAS_ORDER) contentByEtapa.set(e, new Set());

  function addContent(utmContent: string) {
    const etapa = extractEtapa(utmContent);
    if (etapa) contentByEtapa.get(etapa)!.add(utmContent.trim());
  }

  const opts = { customOrigen: options?.customOrigen };
  [...trialsData, ...newPaymentsData]
    .filter((r) => campaignToFlujoGroup(r.utm_campaign, opts) === "Flujos")
    .forEach((r) => addContent(r.utm_content));

  const rows: TableRow[] = [];
  let rowIndex = 0;
  for (const etapa of ETAPAS_ORDER) {
    const contents = Array.from(contentByEtapa.get(etapa)!)
      .filter(Boolean)
      .sort();
    contents.forEach((emailId, i) => {
      rowIndex += 1;
      rows.push({
        etapa,
        emailId,
        label: `${ETAPA_LABELS[etapa]} – Email ${i + 1}`,
        rowIndex,
      });
    });
  }

  const trialsMap = new Map<string, number>();
  const npMap = new Map<string, number>();

  const customCanal = options?.customCanal;
  trialsData
    .filter((r) => campaignToFlujoGroup(r.utm_campaign, opts) === "Flujos")
    .forEach((r) => {
      const canal = canalFromFlujoCampaign(r.utm_campaign, customCanal);
      const etapa = extractEtapa(r.utm_content);
      if (!canal || !etapa) return;
      const key = `${etapa}|${r.utm_content.trim()}|${canal}`;
      trialsMap.set(key, (trialsMap.get(key) ?? 0) + r.valor);
    });

  newPaymentsData
    .filter((r) => campaignToFlujoGroup(r.utm_campaign, opts) === "Flujos")
    .forEach((r) => {
      const canal = canalFromFlujoCampaign(r.utm_campaign, customCanal);
      const etapa = extractEtapa(r.utm_content);
      if (!canal || !etapa) return;
      const key = `${etapa}|${r.utm_content.trim()}|${canal}`;
      npMap.set(key, (npMap.get(key) ?? 0) + r.valor);
    });

  function getTrials(row: TableRow, canal: CanalNormalizado): number {
    const key = `${row.etapa}|${row.emailId}|${canal}`;
    return trialsMap.get(key) ?? 0;
  }

  function getNewPayments(row: TableRow, canal: CanalNormalizado): number {
    const key = `${row.etapa}|${row.emailId}|${canal}`;
    return npMap.get(key) ?? 0;
  }

  return { rows, getTrials, getNewPayments };
}

export function FlujosConversionTable({
  trialsData = [],
  newPaymentsData = [],
  etapaFilter = "todas",
  customCanal = {},
  customOrigen = {},
}: FlujosConversionTableProps) {
  const hasRaw = trialsData.length > 0 || newPaymentsData.length > 0;
  const built = hasRaw
    ? buildFlujosMatrixFromRaw(trialsData, newPaymentsData, { customCanal, customOrigen })
    : { rows: [], getTrials: () => 0, getNewPayments: () => 0 };

  const { rows: allRows, getTrials, getNewPayments } = built;
  const rows =
    etapaFilter === "todas"
      ? allRows
      : allRows.filter((r) => r.etapa === etapaFilter);

  if (rows.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
          Conversión por etapa y email (solo Flujos)
        </h2>
        <p className="text-sm text-gray-500">
          {hasRaw
            ? etapaFilter !== "todas"
              ? `No hay filas de Flujos para la etapa ${ETAPA_LABELS[etapaFilter]}. Prueba con otra etapa o "Todas".`
              : "No hay filas clasificadas como Flujos con etapa-email en content y flujo-canal en campaign. Sube Trials/New Payments con campañas tipo flujo-canal y content etapa-email."
            : "Pasa trialsData y newPaymentsData para ver la tabla (content = etapa-email, campaign = flujo-canal)."}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
        Conversión por etapa y email (solo Flujos)
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Filas: etapa-email desde <em>utm_content</em>. Columnas: canal desde <em>utm_campaign</em> (flujo-canal). Valores: suma de <strong>trials</strong> (y conversiones).
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-nimbus-text-high sticky left-0 bg-gray-50 z-10 min-w-[140px]">
                Etapa – Email
              </th>
              {CANALES_ORDER.map((canal) => (
                <th
                  key={canal}
                  className="px-4 py-3 text-right font-medium text-nimbus-text-high whitespace-nowrap"
                >
                  {CANAL_LABELS[canal]}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-nimbus-text-high bg-nimbus-surface">
                Total trials
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const totalTrials = CANALES_ORDER.reduce(
                (sum, canal) => sum + getTrials(row, canal),
                0
              );
              return (
                <tr
                  key={`${row.etapa}-${row.emailId}-${row.rowIndex}`}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">
                    {row.label}
                  </td>
                  {CANALES_ORDER.map((canal) => (
                    <td
                      key={canal}
                      className="px-4 py-2 text-right tabular-nums"
                    >
                      <span>{getTrials(row, canal) || "—"}</span>
                      {getNewPayments(row, canal) > 0 && (
                        <span className="block text-xs text-gray-500">
                          → {getNewPayments(row, canal)} NP
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-medium tabular-nums bg-nimbus-surface">
                    {totalTrials}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
              <td className="px-4 py-3 sticky left-0 bg-gray-100 z-10">
                Total
              </td>
              {CANALES_ORDER.map((canal) => {
                const colTotal = rows.reduce(
                  (sum, row) => sum + getTrials(row, canal),
                  0
                );
                return (
                  <td
                    key={canal}
                    className="px-4 py-3 text-right tabular-nums"
                  >
                    {colTotal}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right tabular-nums bg-nimbus-surface">
                {rows.reduce(
                  (sum, row) =>
                    sum +
                    CANALES_ORDER.reduce(
                      (s, canal) => s + getTrials(row, canal),
                      0
                    ),
                  0
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

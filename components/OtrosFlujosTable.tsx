"use client";

import type { FilaUnificada, CanalNormalizado } from "@/types";
import { CANAL_LABELS } from "@/lib/icp";
import { campaignToFlujoGroup } from "@/lib/flujoGroups";
import type { CustomOrigenMap } from "@/lib/flujoGroups";

const CANALES_ORDER: CanalNormalizado[] = [
  "tienda-online",
  "redes-sociales",
  "marketplace",
  "tienda-fisica",
  "no-vendo",
  "venden",
  "no-sabemos",
];

interface OtrosFlujosTableProps {
  data: FilaUnificada[];
  customOrigen?: CustomOrigenMap;
}

/** Agrupa por (flujoGroup, canal) y suma trials y new_payments. Excluye "Flujos". */
function buildOtrosFlujosMatrix(data: FilaUnificada[], customOrigen?: CustomOrigenMap) {
  const flujoSet = new Set<string>();
  const trialsMap = new Map<string, number>();
  const npMap = new Map<string, number>();
  const opts = { customOrigen };

  for (const r of data) {
    const flujo = campaignToFlujoGroup(r.utm_campaign, opts);
    if (flujo === "Flujos") continue;
    flujoSet.add(flujo);
    const keyT = `${flujo}|${r.canal}`;
    const keyNp = `${flujo}|${r.canal}`;
    trialsMap.set(keyT, (trialsMap.get(keyT) ?? 0) + r.trials);
    npMap.set(keyNp, (npMap.get(keyNp) ?? 0) + r.new_payments);
  }

  const flujoRows = Array.from(flujoSet).sort();
  return {
    flujoRows,
    getTrials: (flujo: string, canal: CanalNormalizado) =>
      trialsMap.get(`${flujo}|${canal}`) ?? 0,
    getNewPayments: (flujo: string, canal: CanalNormalizado) =>
      npMap.get(`${flujo}|${canal}`) ?? 0,
  };
}

export function OtrosFlujosTable({ data, customOrigen = {} }: OtrosFlujosTableProps) {
  const opts = { customOrigen };
  const otros = data.filter((r) => campaignToFlujoGroup(r.utm_campaign, opts) !== "Flujos");
  const { flujoRows, getTrials, getNewPayments } = buildOtrosFlujosMatrix(otros, customOrigen);

  if (flujoRows.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
          Otros flujos (Broadcast, Eventos, Afiliados, Entrenamiento Nube, etc.)
        </h2>
        <p className="text-sm text-gray-500">
          No hay datos de otros flujos (todo está en Flujos o no hay datos).
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
        Otros flujos (Broadcast, Eventos, Afiliados, Entrenamiento Nube, etc.)
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Tabla por tipo de flujo (excluyendo Flujos) y canal. Valores: trials y new payments.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-nimbus-text-high sticky left-0 bg-gray-50 z-10 min-w-[160px]">
                Flujo
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
              <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">
                Total NP
              </th>
            </tr>
          </thead>
          <tbody>
            {flujoRows.map((flujo) => {
              const totalTrials = CANALES_ORDER.reduce(
                (sum, canal) => sum + getTrials(flujo, canal),
                0
              );
              const totalNp = CANALES_ORDER.reduce(
                (sum, canal) => sum + getNewPayments(flujo, canal),
                0
              );
              return (
                <tr
                  key={flujo}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">
                    {flujo}
                  </td>
                  {CANALES_ORDER.map((canal) => (
                    <td
                      key={canal}
                      className="px-4 py-2 text-right tabular-nums"
                    >
                      <span>{getTrials(flujo, canal) || "—"}</span>
                      {getNewPayments(flujo, canal) > 0 && (
                        <span className="block text-xs text-gray-500">
                          → {getNewPayments(flujo, canal)} NP
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-medium tabular-nums bg-nimbus-surface">
                    {totalTrials}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                    {totalNp}
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
                const colTrials = flujoRows.reduce(
                  (sum, flujo) => sum + getTrials(flujo, canal),
                  0
                );
                return (
                  <td
                    key={canal}
                    className="px-4 py-3 text-right tabular-nums"
                  >
                    {colTrials}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right tabular-nums bg-nimbus-surface">
                {flujoRows.reduce(
                  (sum, flujo) =>
                    sum +
                    CANALES_ORDER.reduce(
                      (s, canal) => s + getTrials(flujo, canal),
                      0
                    ),
                  0
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {flujoRows.reduce(
                  (sum, flujo) =>
                    sum +
                    CANALES_ORDER.reduce(
                      (s, canal) => s + getNewPayments(flujo, canal),
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

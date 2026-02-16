"use client";

import type { FilaTableau, CanalNormalizado } from "@/types";
import { normalizarCanal } from "@/lib/icp";
import { CANAL_LABELS } from "@/lib/icp";
import { campaignToFlujoGroup } from "@/lib/flujoGroups";

const CANALES_ORDER: CanalNormalizado[] = [
  "tienda-online",
  "redes-sociales",
  "marketplace",
  "tienda-fisica",
  "no-vendo",
  "venden",
  "no-sabemos",
];

function formatVal(n: number): string {
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return x.toFixed(2);
}

function formatPct(num: number, den: number): string {
  if (den === 0) return "—";
  return (100 * num) / den === 0 ? "—" : ((100 * num) / den).toFixed(2) + "%";
}

interface TableauTablesProps {
  trialsData: FilaTableau[];
  newPaymentsData: FilaTableau[];
}

/** Construye matriz: filas = canales ICP, columnas = flujos (utm_campaign agrupado), valores = suma de valor. */
function buildMatrix(rows: FilaTableau[]): { flujoColumns: string[]; matrix: Map<string, Map<string, number>> } {
  const flujoSet = new Set<string>();
  const matrix = new Map<string, Map<string, number>>();

  for (const canal of CANALES_ORDER) {
    matrix.set(canal, new Map());
  }

  for (const r of rows) {
    const canal = normalizarCanal(r.utm_content);
    const flujo = campaignToFlujoGroup(r.utm_campaign || r.utm_content);
    flujoSet.add(flujo);

    if (!matrix.has(canal)) matrix.set(canal, new Map());
    const rowMap = matrix.get(canal)!;
    rowMap.set(flujo, (rowMap.get(flujo) ?? 0) + r.valor);
  }

  const flujoColumns = Array.from(flujoSet).sort();
  return { flujoColumns, matrix };
}

export function TableauTables({ trialsData, newPaymentsData }: TableauTablesProps) {
  const hasTrials = trialsData.length > 0;
  const hasNP = newPaymentsData.length > 0;

  const { flujoColumns: trialsFlujos, matrix: trialsMatrix } = buildMatrix(trialsData);
  const { flujoColumns: npFlujos, matrix: npMatrix } = buildMatrix(newPaymentsData);

  const trialsGrandTotal = trialsFlujos.length
    ? CANALES_ORDER.reduce(
        (sum, canal) =>
          sum + trialsFlujos.reduce((s, f) => s + (trialsMatrix.get(canal)!.get(f) ?? 0), 0),
        0
      )
    : 0;
  const npGrandTotal = npFlujos.length
    ? CANALES_ORDER.reduce(
        (sum, canal) => sum + npFlujos.reduce((s, f) => s + (npMatrix.get(canal)!.get(f) ?? 0), 0),
        0
      )
    : 0;

  const trialsColTotals = new Map<string, number>();
  trialsFlujos.forEach((flujo) => {
    trialsColTotals.set(
      flujo,
      CANALES_ORDER.reduce((sum, canal) => sum + (trialsMatrix.get(canal)!.get(flujo) ?? 0), 0)
    );
  });
  const npColTotals = new Map<string, number>();
  npFlujos.forEach((flujo) => {
    npColTotals.set(
      flujo,
      CANALES_ORDER.reduce((sum, canal) => sum + (npMatrix.get(canal)!.get(flujo) ?? 0), 0)
    );
  });

  return (
    <div className="space-y-8">
      {hasTrials && (
        <section>
          <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
            Trials por canal y flujo (Tableau)
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-nimbus-text-high sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                    Canal (ICP)
                  </th>
                  {trialsFlujos.map((flujo) => (
                    <th key={flujo} className="px-4 py-3 text-right font-medium text-nimbus-text-high whitespace-nowrap">
                      {flujo}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-nimbus-text-high bg-nimbus-surface">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-nimbus-text-high whitespace-nowrap">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {CANALES_ORDER.map((canal) => {
                  const rowMap = trialsMatrix.get(canal)!;
                  const total = trialsFlujos.reduce((sum, f) => sum + (rowMap.get(f) ?? 0), 0);
                  return (
                    <tr key={canal} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">
                        {CANAL_LABELS[canal]}
                      </td>
                      {trialsFlujos.map((flujo) => {
                        const val = rowMap.get(flujo) ?? 0;
                        const colTotal = trialsColTotals.get(flujo) ?? 0;
                        return (
                          <td key={flujo} className="px-4 py-2 text-right tabular-nums">
                            <span>{formatVal(val)}</span>
                            {colTotal > 0 && (
                              <span className="block text-xs text-gray-500">
                                {formatPct(val, colTotal)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-medium tabular-nums bg-nimbus-surface">
                        {formatVal(total)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatPct(total, trialsGrandTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                  <td className="px-4 py-3 sticky left-0 bg-gray-100 z-10">Total</td>
                  {trialsFlujos.map((flujo) => {
                    const colTotal = CANALES_ORDER.reduce(
                      (sum, canal) => sum + (trialsMatrix.get(canal)!.get(flujo) ?? 0),
                      0
                    );
                    return (
                      <td key={flujo} className="px-4 py-3 text-right tabular-nums">
                        <span>{formatVal(colTotal)}</span>
                        {trialsGrandTotal > 0 && (
                          <span className="block text-xs text-gray-600 font-normal">
                            {formatPct(colTotal, trialsGrandTotal)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right tabular-nums bg-nimbus-surface">
                    {formatVal(trialsGrandTotal)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {trialsGrandTotal > 0 ? "100.00%" : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {hasNP && (
        <section>
          <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
            New Payments por canal y flujo (Tableau)
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-nimbus-text-high sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                    Canal (ICP)
                  </th>
                  {npFlujos.map((flujo) => (
                    <th key={flujo} className="px-4 py-3 text-right font-medium text-nimbus-text-high whitespace-nowrap">
                      {flujo}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-nimbus-text-high bg-nimbus-surface">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-nimbus-text-high whitespace-nowrap">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {CANALES_ORDER.map((canal) => {
                  const rowMap = npMatrix.get(canal)!;
                  const total = npFlujos.reduce((sum, f) => sum + (rowMap.get(f) ?? 0), 0);
                  return (
                    <tr key={canal} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">
                        {CANAL_LABELS[canal]}
                      </td>
                      {npFlujos.map((flujo) => {
                        const val = rowMap.get(flujo) ?? 0;
                        const colTotal = npColTotals.get(flujo) ?? 0;
                        return (
                          <td key={flujo} className="px-4 py-2 text-right tabular-nums">
                            <span>{formatVal(val)}</span>
                            {colTotal > 0 && (
                              <span className="block text-xs text-gray-500">
                                {formatPct(val, colTotal)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-medium tabular-nums bg-nimbus-surface">
                        {formatVal(total)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatPct(total, npGrandTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                  <td className="px-4 py-3 sticky left-0 bg-gray-100 z-10">Total</td>
                  {npFlujos.map((flujo) => {
                    const colTotal = CANALES_ORDER.reduce(
                      (sum, canal) => sum + (npMatrix.get(canal)!.get(flujo) ?? 0),
                      0
                    );
                    return (
                      <td key={flujo} className="px-4 py-3 text-right tabular-nums">
                        <span>{formatVal(colTotal)}</span>
                        {npGrandTotal > 0 && (
                          <span className="block text-xs text-gray-600 font-normal">
                            {formatPct(colTotal, npGrandTotal)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right tabular-nums bg-nimbus-surface">
                    {formatVal(npGrandTotal)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {npGrandTotal > 0 ? "100.00%" : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {!hasTrials && !hasNP && (
        <p className="text-gray-500 text-sm">
          Sube al menos el CSV de Trials o el de New Payments (Tableau) para ver las tablas por canal y flujo.
        </p>
      )}
    </div>
  );
}

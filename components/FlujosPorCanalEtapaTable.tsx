"use client";

import React, { useState, useMemo } from "react";
import type { FilaTableau } from "@/types";
import type { EtapaFunnel } from "@/types";
import { campaignToFlujoGroup } from "@/lib/flujoGroups";
import type { CustomOrigenMap } from "@/lib/flujoGroups";
import { extractEtapa } from "@/lib/merge";

/** Filas del funnel + flujos no-funnel (inactividad, consejos, antiguos). */
export type RowType = EtapaFunnel | "inactividad" | "consejos" | "antiguos";
const ROW_TYPES_ORDER: RowType[] = ["tofu", "mofu", "bofu", "inactividad", "consejos", "antiguos"];
const ROW_LABELS: Record<RowType, string> = {
  tofu: "TOFU",
  mofu: "MOFU",
  bofu: "BOFU",
  inactividad: "Inactividad",
  consejos: "Consejos (opcionales)",
  antiguos: "Flujos antiguos",
};

/** Sub-tipos de flujos antiguos (fidelización sin canal, bienvenida, otros). */
const ANTIGUOS_SUB_ORDER = ["fidelizacion", "bienvenida", "otros"] as const;
const ANTIGUOS_SUB_LABELS: Record<string, string> = {
  fidelizacion: "Fidelización",
  bienvenida: "Bienvenida",
  otros: "Otros",
};

/** Clasifica la fila: etapa > inactividad > consejos; flujo-(canal)+bienvenida → TOFU; luego antiguos (fidelización, bienvenida sin canal, otros). */
function getRowType(r: { utm_campaign: string; utm_content: string }): RowType | null {
  const etapa = extractEtapa(r.utm_content);
  if (etapa) return etapa;
  const camp = (r.utm_campaign ?? "").toLowerCase();
  const cont = (r.utm_content ?? "").toLowerCase();
  if (/inactividad/i.test(camp) || /inactividad/i.test(cont)) return "inactividad";
  if (/consejos/i.test(camp) || /consejos/i.test(cont)) return "consejos";
  // Si campaign es flujo-(canal) y content dice bienvenida → va arriba (TOFU), no a Flujos antiguos
  if (/bienvenida/i.test(cont) && hasCanalInCampaign(r.utm_campaign)) return "tofu";
  if (/bienvenida/i.test(camp) && hasCanalInCampaign(r.utm_campaign)) return "tofu";
  // Resto: fidelización o bienvenida sin canal u otros → antiguos
  if (/fidelizac/i.test(camp) || /fidelizac/i.test(cont)) return "antiguos";
  if (/bienvenida/i.test(camp) || /bienvenida/i.test(cont)) return "antiguos";
  return "antiguos";
}

/** Extrae canal desde utm_content cuando viene (ej. inactividad-rrss → rrss, consejos-mktplace → mktplace). */
function canalFromContent(utmContent: string): string | null {
  const s = (utmContent ?? "").trim().toLowerCase();
  const match = s.match(/(?:inactividad|consejos)[-_]([a-z0-9_]+)/);
  if (match) return match[1];
  const match2 = s.match(/flujo[-_]([^\-_]+)/);
  if (match2) return match2[1];
  return null;
}

/** Para funnel usa emailId (tofu1); inactividad/consejos: canal desde utm_content si viene, sino utm_content; antiguos: fidelización/bienvenida/otros. */
function getSubRowId(r: { utm_campaign: string; utm_content: string }, rowType: RowType): string {
  if (rowType === "tofu" || rowType === "mofu" || rowType === "bofu") {
    return emailIdFromContent(r.utm_content, rowType as EtapaFunnel);
  }
  if (rowType === "antiguos") {
    const camp = (r.utm_campaign ?? "").toLowerCase();
    const cont = (r.utm_content ?? "").toLowerCase();
    if (/fidelizac/i.test(camp) || /fidelizac/i.test(cont)) return "fidelizacion";
    if (/bienvenida/i.test(camp) || /bienvenida/i.test(cont)) return "bienvenida";
    return "otros";
  }
  const canal = canalFromContent(r.utm_content);
  if (canal) return canal;
  return (r.utm_content ?? "").trim() || "—";
}

/** Extrae el "canal" del flujo desde utm_campaign (ej. flujo-rrss → rrss, flujo-inactividad → inactividad). */
function flujoColumnFromCampaign(campaign: string): string {
  const s = (campaign ?? "").trim().toLowerCase();
  const match = s.match(/flujo[-_]([^\-_]+)/);
  if (match) return match[1];
  if (/flujo/i.test(s)) return s.replace(/^flujo[-_]?/i, "").split(/[-_]/)[0] ?? s;
  return s;
}

/** True si la campaña es flujo-(canal) con canal de venta (rrss, mktplace, etc.), no fidelización/bienvenida. */
const CANAL_SLUGS = new Set([
  "rrss", "redes", "mktplace", "marketplace", "isr",
  "tienda_online", "tiendaonline", "fisica", "tienda_fisica", "tiendafisica",
]);
function hasCanalInCampaign(campaign: string): boolean {
  const slug = flujoColumnFromCampaign(campaign);
  return CANAL_SLUGS.has(slug);
}

/** Extrae identificador de email desde utm_content (tofu1, mofu2, bofu1, etc.). */
function emailIdFromContent(utmContent: string, etapa: EtapaFunnel): string {
  const lower = (utmContent ?? "").toLowerCase();
  const match = lower.match(new RegExp(`(${etapa})(\\d+)`));
  if (match) return `${match[1]}${match[2]}`;
  return utmContent.trim() || "—";
}

interface FlujosPorCanalEtapaTableProps {
  trialsData: FilaTableau[];
  newPaymentsData?: FilaTableau[];
  customOrigen?: CustomOrigenMap;
}

function sortEmailIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });
}

/** Etiqueta para mostrar en sub-row: antiguos usa Fidelización/Bienvenida/Otros; resto el id. */
function subRowLabel(rowType: RowType, subRowId: string): string {
  if (rowType === "antiguos" && ANTIGUOS_SUB_LABELS[subRowId]) {
    return ANTIGUOS_SUB_LABELS[subRowId];
  }
  return subRowId;
}

export function FlujosPorCanalEtapaTable({
  trialsData,
  newPaymentsData = [],
  customOrigen = {},
}: FlujosPorCanalEtapaTableProps) {
  const [expandedRow, setExpandedRow] = useState<RowType | null>(null);
  const [expandedRowNP, setExpandedRowNP] = useState<RowType | null>(null);

  const opts = { customOrigen };

  const { flujoColumns, getTrials, getTrialsBySubRow, getSubRowIds, getNP, getNPBySubRow, getSubRowIdsNP } = useMemo(() => {
    const flujosTrials = trialsData.filter((r) => campaignToFlujoGroup(r.utm_campaign, opts) === "Flujos");
    const flujosNP = newPaymentsData.filter((r) => campaignToFlujoGroup(r.utm_campaign, opts) === "Flujos");

    const columnSet = new Set<string>();
    const trialsMap = new Map<string, number>();
    const trialsBySubRowMap = new Map<string, number>();
    const npMap = new Map<string, number>();
    const npBySubRowMap = new Map<string, number>();

    for (const r of flujosTrials) {
      const rowType = getRowType(r);
      if (!rowType) continue;
      const col = flujoColumnFromCampaign(r.utm_campaign);
      const subRowId = getSubRowId(r, rowType);
      columnSet.add(col);
      const key = `${col}|${rowType}`;
      trialsMap.set(key, (trialsMap.get(key) ?? 0) + r.valor);
      const keySub = `${col}|${rowType}|${subRowId}`;
      trialsBySubRowMap.set(keySub, (trialsBySubRowMap.get(keySub) ?? 0) + r.valor);
    }
    for (const r of flujosNP) {
      const rowType = getRowType(r);
      if (!rowType) continue;
      const col = flujoColumnFromCampaign(r.utm_campaign);
      const subRowId = getSubRowId(r, rowType);
      columnSet.add(col);
      const key = `${col}|${rowType}`;
      npMap.set(key, (npMap.get(key) ?? 0) + r.valor);
      const keySub = `${col}|${rowType}|${subRowId}`;
      npBySubRowMap.set(keySub, (npBySubRowMap.get(keySub) ?? 0) + r.valor);
    }

    const flujoColumns = Array.from(columnSet).sort();

    const getSubRowIdsFrom = (data: typeof flujosTrials) => (rowType: RowType): string[] => {
      const ids = new Set<string>();
      for (const r of data) {
        if (getRowType(r) === rowType) {
          ids.add(getSubRowId(r, rowType));
        }
      }
      if (rowType === "tofu" || rowType === "mofu" || rowType === "bofu") {
        return sortEmailIds(Array.from(ids));
      }
      if (rowType === "antiguos") {
        return ANTIGUOS_SUB_ORDER.filter((id) => ids.has(id));
      }
      return Array.from(ids).sort();
    };

    return {
      flujoColumns,
      getTrials: (col: string, rowType: RowType) => trialsMap.get(`${col}|${rowType}`) ?? 0,
      getTrialsBySubRow: (col: string, rowType: RowType, subRowId: string) =>
        trialsBySubRowMap.get(`${col}|${rowType}|${subRowId}`) ?? 0,
      getSubRowIds: getSubRowIdsFrom(flujosTrials),
      getNP: (col: string, rowType: RowType) => npMap.get(`${col}|${rowType}`) ?? 0,
      getNPBySubRow: (col: string, rowType: RowType, subRowId: string) =>
        npBySubRowMap.get(`${col}|${rowType}|${subRowId}`) ?? 0,
      getSubRowIdsNP: getSubRowIdsFrom(flujosNP),
    };
  }, [trialsData, newPaymentsData, customOrigen]);

  if (flujoColumns.length === 0) {
    return (
      <section>
        <h3 className="text-base font-medium text-nimbus-text-high mb-3">
          Conversión Trial por canal y etapa (Flujos)
        </h3>
        <p className="text-sm text-gray-500">
          No hay datos de flujos (campañas que empiecen con flujo-). Sube Trials con campañas tipo flujo-rrss, flujo-mktplace, flujo-inactividad, etc.
        </p>
      </section>
    );
  }

  const labelColumn = (slug: string) =>
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, " ");

  return (
    <section>
      <h3 className="text-base font-medium text-nimbus-text-high mb-3">
        Conversión Trial por canal y etapa (Flujos)
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        Filas = TOFU, MOFU, BOFU, Inactividad, Consejos, Flujos antiguos (fidelización, bienvenida, otros). Columnas = canal del flujo. Valores = suma de trials. Haz clic en una fila para ver el detalle por email/variante/canal.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-nimbus-text-high sticky left-0 bg-gray-50 z-10 min-w-[120px]">
                  Etapa / tipo
                </th>
              {flujoColumns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-right font-medium text-nimbus-text-high whitespace-nowrap"
                >
                  {labelColumn(col)}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-nimbus-text-high bg-gray-100">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {ROW_TYPES_ORDER.map((rowType) => {
              const total = flujoColumns.reduce((s, col) => s + getTrials(col, rowType), 0);
              const isExpanded = expandedRow === rowType;
              return (
                <React.Fragment key={rowType}>
                  <tr
                    className={`border-b border-gray-100 hover:bg-gray-50 ${isExpanded ? "bg-gray-50" : ""}`}
                  >
                    <td className="px-4 py-2 sticky left-0 bg-white z-10">
                      <button
                        type="button"
                        onClick={() => setExpandedRow(isExpanded ? null : rowType)}
                        className="font-medium text-gray-800 flex items-center gap-2 text-left"
                      >
                        <span className="inline-block w-5 text-gray-500">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                        {ROW_LABELS[rowType]}
                      </button>
                    </td>
                    {flujoColumns.map((col) => (
                      <td key={col} className="px-4 py-2 text-right tabular-nums">
                        {getTrials(col, rowType) || "—"}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-medium tabular-nums bg-gray-100">
                      {total || "—"}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={flujoColumns.length + 2} className="p-0 bg-gray-50">
                        <div className="px-4 py-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-2">
                            Detalle {ROW_LABELS[rowType]} — conversión por email / variante
                          </p>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border border-gray-200 rounded bg-white">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-100">
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                                    Email / variante
                                  </th>
                                  {flujoColumns.map((col) => (
                                    <th
                                      key={col}
                                      className="px-3 py-2 text-right font-medium text-gray-700"
                                    >
                                      {labelColumn(col)}
                                    </th>
                                  ))}
                                  <th className="px-3 py-2 text-right font-medium text-gray-700">
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {getSubRowIds(rowType).map((subRowId) => {
                                  const rowTotal = flujoColumns.reduce(
                                    (s, col) => s + getTrialsBySubRow(col, rowType, subRowId),
                                    0
                                  );
                                  return (
                                    <tr key={subRowId} className="border-b border-gray-100">
                                      <td className="px-3 py-1.5 font-medium text-gray-800 max-w-[200px] truncate" title={subRowId}>
                                        {subRowLabel(rowType, subRowId)}
                                      </td>
                                      {flujoColumns.map((col) => (
                                        <td
                                          key={col}
                                          className="px-3 py-1.5 text-right tabular-nums"
                                        >
                                          {getTrialsBySubRow(col, rowType, subRowId) || "—"}
                                        </td>
                                      ))}
                                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                                        {rowTotal || "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
              <td className="px-4 py-3 sticky left-0 bg-gray-100 z-10">Total</td>
              {flujoColumns.map((col) => (
                <td key={col} className="px-4 py-3 text-right tabular-nums">
                  {ROW_TYPES_ORDER.reduce((s, rt) => s + getTrials(col, rt), 0)}
                </td>
              ))}
              <td className="px-4 py-3 text-right tabular-nums">
                {ROW_TYPES_ORDER.reduce(
                  (s, rowType) => s + flujoColumns.reduce((t, col) => t + getTrials(col, rowType), 0),
                  0
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tabla New Payment por canal y etapa (misma estructura, expandible por email) */}
      <div className="mt-8">
        <h3 className="text-base font-medium text-nimbus-text-high mb-3">
          Conversión New Payment por canal y etapa (Flujos)
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Misma estructura: filas = TOFU, MOFU, BOFU, Inactividad, Consejos, Flujos antiguos; columnas = canal del flujo. Valores = suma de new payments. Haz clic en una fila para ver el detalle por email/variante/canal.
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-nimbus-text-high sticky left-0 bg-gray-50 z-10 min-w-[120px]">
                  Etapa / tipo
                </th>
                {flujoColumns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-right font-medium text-nimbus-text-high whitespace-nowrap"
                  >
                    {labelColumn(col)}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high bg-gray-100">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {ROW_TYPES_ORDER.map((rowType) => {
                const totalNP = flujoColumns.reduce((s, col) => s + getNP(col, rowType), 0);
                const isExpandedNP = expandedRowNP === rowType;
                return (
                  <React.Fragment key={`np-${rowType}`}>
                    <tr
                      className={`border-b border-gray-100 hover:bg-gray-50 ${isExpandedNP ? "bg-gray-50" : ""}`}
                    >
                      <td className="px-4 py-2 sticky left-0 bg-white z-10">
                        <button
                          type="button"
                          onClick={() => setExpandedRowNP(isExpandedNP ? null : rowType)}
                          className="font-medium text-gray-800 flex items-center gap-2 text-left"
                        >
                          <span className="inline-block w-5 text-gray-500">
                            {isExpandedNP ? "▼" : "▶"}
                          </span>
                          {ROW_LABELS[rowType]}
                        </button>
                      </td>
                      {flujoColumns.map((col) => (
                        <td key={col} className="px-4 py-2 text-right tabular-nums">
                          {getNP(col, rowType) || "—"}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-medium tabular-nums bg-gray-100">
                        {totalNP || "—"}
                      </td>
                    </tr>
                    {isExpandedNP && (
                      <tr>
                        <td colSpan={flujoColumns.length + 2} className="p-0 bg-gray-50">
                          <div className="px-4 py-3 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-600 mb-2">
                              Detalle {ROW_LABELS[rowType]} — New Payment por email / variante
                            </p>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm border border-gray-200 rounded bg-white">
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-100">
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Email / variante
                                    </th>
                                    {flujoColumns.map((col) => (
                                      <th
                                        key={col}
                                        className="px-3 py-2 text-right font-medium text-gray-700"
                                      >
                                        {labelColumn(col)}
                                      </th>
                                    ))}
                                    <th className="px-3 py-2 text-right font-medium text-gray-700">
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getSubRowIdsNP(rowType).map((subRowId) => {
                                    const rowTotal = flujoColumns.reduce(
                                      (s, col) => s + getNPBySubRow(col, rowType, subRowId),
                                      0
                                    );
                                    return (
                                      <tr key={subRowId} className="border-b border-gray-100">
                                        <td className="px-3 py-1.5 font-medium text-gray-800 max-w-[200px] truncate" title={subRowId}>
                                          {subRowLabel(rowType, subRowId)}
                                        </td>
                                        {flujoColumns.map((col) => (
                                          <td
                                            key={col}
                                            className="px-3 py-1.5 text-right tabular-nums"
                                          >
                                            {getNPBySubRow(col, rowType, subRowId) || "—"}
                                          </td>
                                        ))}
                                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                                          {rowTotal || "—"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                <td className="px-4 py-3 sticky left-0 bg-gray-100 z-10">Total</td>
                {flujoColumns.map((col) => (
                  <td key={col} className="px-4 py-3 text-right tabular-nums">
                    {ROW_TYPES_ORDER.reduce((s, rt) => s + getNP(col, rt), 0)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right tabular-nums">
                  {ROW_TYPES_ORDER.reduce(
                    (s, rowType) => s + flujoColumns.reduce((t, col) => t + getNP(col, rowType), 0),
                    0
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

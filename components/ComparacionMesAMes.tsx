"use client";

import React, { useState, useMemo } from "react";
import { parseTrialsCSV, parseNewPaymentsCSV } from "@/lib/parseUploads";
import { normalizarCanal } from "@/lib/icp";
import { campaignToFlujoGroup } from "@/lib/flujoGroups";
import type { FilaTableau } from "@/types";
import type { CanalNormalizado } from "@/types";
import type { CustomCanalMap } from "@/lib/icp";
import type { CustomOrigenMap, OrigenLabel } from "@/lib/flujoGroups";
import { CANAL_LABELS } from "@/lib/icp";
import { ORIGEN_LABELS } from "@/lib/flujoGroups";

type SlotComparacion = "trialM1" | "trialM" | "npM1" | "npM";

const CANAL_ORDER: CanalNormalizado[] = [
  "tienda-online",
  "redes-sociales",
  "marketplace",
  "tienda-fisica",
  "no-vendo",
  "venden",
  "no-sabemos",
];

function aggregateByCanal(rows: FilaTableau[], opts: { customCanal?: CustomCanalMap }): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const text = [(r.utm_content ?? "").trim(), (r.utm_campaign ?? "").trim()].filter(Boolean).join(" ");
    const canal = normalizarCanal(text, opts);
    map.set(canal, (map.get(canal) ?? 0) + r.valor);
  }
  return map;
}

function aggregateByOrigen(rows: FilaTableau[], opts: { customOrigen?: CustomOrigenMap }): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const origen = campaignToFlujoGroup(r.utm_campaign, opts) as string;
    map.set(origen, (map.get(origen) ?? 0) + r.valor);
  }
  return map;
}

function pctChange(m1: number, m: number): { value: number; label: string } {
  if (m1 === 0 && m === 0) return { value: 0, label: "—" };
  if (m1 === 0) return { value: 100, label: "Nuevo" };
  const pct = ((m - m1) / m1) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { value: pct, label: `${sign}${pct.toFixed(1)}%` };
}

interface ComparacionMesAMesProps {
  customCanal?: CustomCanalMap;
  customOrigen?: CustomOrigenMap;
}

export function ComparacionMesAMes({ customCanal = {}, customOrigen = {} }: ComparacionMesAMesProps) {
  const [trialM1Text, setTrialM1Text] = useState("");
  const [trialMText, setTrialMText] = useState("");
  const [npM1Text, setNpM1Text] = useState("");
  const [npMText, setNpMText] = useState("");

  const handleLoad = (slot: SlotComparacion, text: string) => {
    if (slot === "trialM1") setTrialM1Text(text);
    else if (slot === "trialM") setTrialMText(text);
    else if (slot === "npM1") setNpM1Text(text);
    else setNpMText(text);
  };

  const trialM1 = useMemo(() => (trialM1Text ? parseTrialsCSV(trialM1Text) : []), [trialM1Text]);
  const trialM = useMemo(() => (trialMText ? parseTrialsCSV(trialMText) : []), [trialMText]);
  const npM1 = useMemo(() => (npM1Text ? parseNewPaymentsCSV(npM1Text) : []), [npM1Text]);
  const npM = useMemo(() => (npMText ? parseNewPaymentsCSV(npMText) : []), [npMText]);

  const opts = { customCanal, customOrigen };

  const trialsByCanalM1 = useMemo(() => aggregateByCanal(trialM1, opts), [trialM1, customCanal]);
  const trialsByCanalM = useMemo(() => aggregateByCanal(trialM, opts), [trialM, customCanal]);
  const trialsByOrigenM1 = useMemo(() => aggregateByOrigen(trialM1, opts), [trialM1, customOrigen]);
  const trialsByOrigenM = useMemo(() => aggregateByOrigen(trialM, opts), [trialM, customOrigen]);
  const npByCanalM1 = useMemo(() => aggregateByCanal(npM1, opts), [npM1, customCanal]);
  const npByCanalM = useMemo(() => aggregateByCanal(npM, opts), [npM, customCanal]);
  const npByOrigenM1 = useMemo(() => aggregateByOrigen(npM1, opts), [npM1, customOrigen]);
  const npByOrigenM = useMemo(() => aggregateByOrigen(npM, opts), [npM, customOrigen]);

  const totalTrialM1 = trialM1.reduce((s, r) => s + r.valor, 0);
  const totalTrialM = trialM.reduce((s, r) => s + r.valor, 0);
  const totalNpM1 = npM1.reduce((s, r) => s + r.valor, 0);
  const totalNpM = npM.reduce((s, r) => s + r.valor, 0);

  const insights = useMemo(() => {
    const lines: string[] = [];
    const trialPct = totalTrialM1 > 0 ? ((totalTrialM - totalTrialM1) / totalTrialM1) * 100 : (totalTrialM > 0 ? 100 : 0);
    const npPct = totalNpM1 > 0 ? ((totalNpM - totalNpM1) / totalNpM1) * 100 : (totalNpM > 0 ? 100 : 0);
    lines.push(`Trials: ${totalTrialM1} (M-1) → ${totalTrialM} (M) ${trialPct >= 0 ? "+" : ""}${trialPct.toFixed(1)}%.`);
    lines.push(`New Payments: ${totalNpM1} (M-1) → ${totalNpM} (M) ${npPct >= 0 ? "+" : ""}${npPct.toFixed(1)}%.`);

    const canalKeys = new Set([...Array.from(trialsByCanalM1.keys()), ...Array.from(trialsByCanalM.keys())]);
    const trialCanalChanges = Array.from(canalKeys)
      .map((c) => ({
        canal: c,
        m1: trialsByCanalM1.get(c) ?? 0,
        m: trialsByCanalM.get(c) ?? 0,
        pct: pctChange(trialsByCanalM1.get(c) ?? 0, trialsByCanalM.get(c) ?? 0).value,
      }))
      .filter((x) => x.m1 > 0 || x.m > 0)
      .sort((a, b) => b.pct - a.pct);
    const top3Up = trialCanalChanges.slice(0, 3).filter((x) => x.pct > 0);
    const top3Down = trialCanalChanges.filter((x) => x.pct < 0).slice(0, 3);
    if (top3Up.length) {
      lines.push(
        `Mayor subida Trials por canal: ${top3Up.map((x) => `${CANAL_LABELS[x.canal as CanalNormalizado] ?? x.canal} (${x.pct >= 0 ? "+" : ""}${x.pct.toFixed(1)}%)`).join(", ")}.`
      );
    }
    if (top3Down.length) {
      lines.push(
        `Mayor bajada Trials por canal: ${top3Down.map((x) => `${CANAL_LABELS[x.canal as CanalNormalizado] ?? x.canal} (${x.pct.toFixed(1)}%)`).join(", ")}.`
      );
    }

    const origenKeys = new Set([...Array.from(trialsByOrigenM1.keys()), ...Array.from(trialsByOrigenM.keys())]);
    const trialOrigenChanges = Array.from(origenKeys)
      .map((o) => ({
        origen: o,
        m1: trialsByOrigenM1.get(o) ?? 0,
        m: trialsByOrigenM.get(o) ?? 0,
        pct: pctChange(trialsByOrigenM1.get(o) ?? 0, trialsByOrigenM.get(o) ?? 0).value,
      }))
      .filter((x) => x.m1 > 0 || x.m > 0)
      .sort((a, b) => b.pct - a.pct);
    const topOrigenUp = trialOrigenChanges.slice(0, 2).filter((x) => x.pct > 0);
    const topOrigenDown = trialOrigenChanges.filter((x) => x.pct < 0).slice(0, 2);
    if (topOrigenUp.length) {
      lines.push(`Trials por origen (suben): ${topOrigenUp.map((x) => `${x.origen} (${x.pct >= 0 ? "+" : ""}${x.pct.toFixed(1)}%)`).join(", ")}.`);
    }
    if (topOrigenDown.length) {
      lines.push(`Trials por origen (bajan): ${topOrigenDown.map((x) => `${x.origen} (${x.pct.toFixed(1)}%)`).join(", ")}.`);
    }

    const npCanalKeys = new Set([...Array.from(npByCanalM1.keys()), ...Array.from(npByCanalM.keys())]);
    const npCanalChanges = Array.from(npCanalKeys)
      .map((c) => ({
        canal: c,
        pct: pctChange(npByCanalM1.get(c) ?? 0, npByCanalM.get(c) ?? 0).value,
      }))
      .filter((x) => (npByCanalM1.get(x.canal) ?? 0) > 0 || (npByCanalM.get(x.canal) ?? 0) > 0)
      .sort((a, b) => b.pct - a.pct);
    if (npCanalChanges[0]?.pct > 0) {
      lines.push(`NP con mayor crecimiento por canal: ${CANAL_LABELS[npCanalChanges[0].canal as CanalNormalizado] ?? npCanalChanges[0].canal} (${npCanalChanges[0].pct >= 0 ? "+" : ""}${npCanalChanges[0].pct.toFixed(1)}%).`);
    }
    return lines;
  }, [
    totalTrialM1,
    totalTrialM,
    totalNpM1,
    totalNpM,
    trialsByCanalM1,
    trialsByCanalM,
    trialsByOrigenM1,
    trialsByOrigenM,
    npByCanalM1,
    npByCanalM,
  ]);

  const hasData = trialM1.length > 0 || trialM.length > 0 || npM1.length > 0 || npM.length > 0;

  const renderFileInput = (slot: SlotComparacion, label: string) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        handleLoad(slot, text);
      };
      reader.readAsText(file, "UTF-8");
    };
    return (
      <div key={slot} className="border border-gray-200 rounded-lg bg-white p-4">
        <label className="block text-sm font-medium text-nimbus-text-high mb-2">{label}</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-nimbus-primary file:text-white file:font-medium hover:file:bg-nimbus-primary-hover"
        />
      </div>
    );
  };

  const renderComparisonTable = (
    title: string,
    rowOrder: string[],
    labelFn: (k: string) => string,
    m1Map: Map<string, number>,
    mMap: Map<string, number>
  ) => {
    const rows = rowOrder.filter((k) => (m1Map.get(k) ?? 0) > 0 || (mMap.get(k) ?? 0) > 0);
    if (rows.length === 0) return null;
    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <h4 className="text-sm font-semibold text-nimbus-text-high px-4 py-3 border-b border-gray-200">
          {title}
        </h4>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2 text-left font-medium text-nimbus-text-high">Canal / Origen</th>
              <th className="px-4 py-2 text-right font-medium text-nimbus-text-high">M-1</th>
              <th className="px-4 py-2 text-right font-medium text-nimbus-text-high">M</th>
              <th className="px-4 py-2 text-right font-medium text-nimbus-text-high">Variación %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => {
              const v1 = m1Map.get(k) ?? 0;
              const v = mMap.get(k) ?? 0;
              const { label, value } = pctChange(v1, v);
              const isPositive = value > 0;
              const isNegative = value < 0;
              return (
                <tr key={k} className="border-b border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-800">{labelFn(k)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{v1}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{v}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-medium ${isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-600"}`}>
                    {label}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {rows.reduce((s, k) => s + (m1Map.get(k) ?? 0), 0)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {rows.reduce((s, k) => s + (mMap.get(k) ?? 0), 0)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {pctChange(
                  rows.reduce((s, k) => s + (m1Map.get(k) ?? 0), 0),
                  rows.reduce((s, k) => s + (mMap.get(k) ?? 0), 0)
                ).label}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const origenOrder = [...ORIGEN_LABELS, "Otros"];

  return (
    <section className="space-y-8">
      <p className="text-sm text-gray-600">
        Sube 4 CSVs de Tableau: Trials mes anterior (M-1), Trials mes actual (M), New Payments M-1 y New Payments M. Se comparan por canal y por origen.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderFileInput("trialM1", "Trials (M-1)")}
        {renderFileInput("trialM", "Trials (M)")}
        {renderFileInput("npM1", "New Payments (M-1)")}
        {renderFileInput("npM", "New Payments (M)")}
      </div>

      {hasData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderComparisonTable(
              "Trials por canal (M vs M-1)",
              CANAL_ORDER,
              (k) => CANAL_LABELS[k as CanalNormalizado] ?? k,
              trialsByCanalM1,
              trialsByCanalM
            )}
            {renderComparisonTable(
              "Trials por origen (M vs M-1)",
              origenOrder,
              (k) => k,
              trialsByOrigenM1,
              trialsByOrigenM
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderComparisonTable(
              "New Payments por canal (M vs M-1)",
              CANAL_ORDER,
              (k) => CANAL_LABELS[k as CanalNormalizado] ?? k,
              npByCanalM1,
              npByCanalM
            )}
            {renderComparisonTable(
              "New Payments por origen (M vs M-1)",
              origenOrder,
              (k) => k,
              npByOrigenM1,
              npByOrigenM
            )}
          </div>

          {insights.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-nimbus-surface p-4">
              <h3 className="text-base font-semibold text-nimbus-text-high mb-3">Insights principales</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {insights.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

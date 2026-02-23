"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";
import type { FilaUnificada, FilaHubSpot, CanalNormalizado, EtapaFunnel } from "@/types";
import { CANAL_LABELS, normalizarCanal } from "@/lib/icp";
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

const FUNNEL_COLORS = ["#94a3b8", "#3b82f6", "#8b5cf6", "#0059d5", "#00a650"];
const BAR_BEST = "#00a650";
const BAR_WORST = "#e74c3c";
const BAR_DEFAULT_OPEN = "#3b82f6";
const BAR_DEFAULT_CLICK = "#8b5cf6";

interface FullFunnelDashboardProps {
  data: FilaUnificada[];
  /** Filas crudas de HubSpot (una por correo). Si se pasan, los gráficos open/click rate muestran todos los correos, no agrupados. */
  hubspotRows?: FilaHubSpot[];
}

export function FullFunnelDashboard({ data, hubspotRows = [] }: FullFunnelDashboardProps) {
  const [canal, setCanal] = useState<CanalNormalizado | "todos">("todos");
  const [etapa, setEtapa] = useState<EtapaFunnel | "todas">("todas");

  const filteredData = useMemo(() => {
    let list = data;
    if (canal !== "todos") list = list.filter((r) => r.canal === canal);
    if (etapa !== "todas") list = list.filter((r) => r.etapa === etapa);
    return list;
  }, [data, canal, etapa]);

  /** Filas de HubSpot filtradas por canal/etapa (una fila = un correo). Se usa para gráficos por correo cuando hay datos HubSpot. */
  const filteredHubspotRows = useMemo(() => {
    if (hubspotRows.length === 0) return [];
    return hubspotRows.filter((r) => {
      const rowCanal = normalizarCanal(r.utm_content);
      const rowEtapa = extractEtapa(r.utm_content);
      if (canal !== "todos" && rowCanal !== canal) return false;
      if (etapa !== "todas" && rowEtapa !== etapa) return false;
      return true;
    });
  }, [hubspotRows, canal, etapa]);

  /** Gráfico 1: por etapa (eje Y) → correos enviados (eje X). */
  const sendsByEtapa = useMemo(() => {
    const map = new Map<string, number>();
    ETAPAS_ORDER.forEach((e) => map.set(e, 0));
    for (const row of filteredData) {
      const key = row.etapa ?? "sin-etapa";
      if (key !== "sin-etapa" && map.has(key)) {
        map.set(key, (map.get(key) ?? 0) + row.sends);
      }
    }
    return ETAPAS_ORDER.map((e) => ({
      etapa: e,
      label: ETAPA_LABELS[e],
      sends: map.get(e) ?? 0,
    })).filter((r) => etapa === "todas" || r.etapa === etapa);
  }, [filteredData, etapa]);

  /** Solo sumar trials que provienen de flujos (campaign contiene "flujo"). */
  const isFromFlujo = (r: FilaUnificada) => /flujo/i.test(r.utm_campaign ?? "");

  /** Etiqueta para correo desde fila unificada */
  const correoLabelUnified = (r: FilaUnificada) =>
    r.nombre_correo?.trim() ||
    [r.utm_campaign, CANAL_LABELS[r.canal], r.etapa ? ETAPA_LABELS[r.etapa] : ""].filter(Boolean).join(" · ");
  /** Etiqueta para correo desde fila HubSpot cruda */
  const correoLabelHubSpot = (r: FilaHubSpot) =>
    r.nombre_correo?.trim() ||
    [r.utm_campaign, CANAL_LABELS[normalizarCanal(r.utm_content)], extractEtapa(r.utm_content) ? ETAPA_LABELS[extractEtapa(r.utm_content)!] : ""].filter(Boolean).join(" · ");

  /** Datos por correo: si hay hubspotRows usamos una fila por correo (todos los emails); si no, usamos merged filteredData. */
  const openRateByCorreo = useMemo(() => {
    const rawRows =
      filteredHubspotRows.length > 0
        ? filteredHubspotRows
            .filter((r) => r.sends > 0)
            .map((r) => ({
              correo: correoLabelHubSpot(r),
              openRate: Math.round((100 * r.opens) / r.sends * 10) / 10,
              opens: r.opens,
              sends: r.sends,
              fill: BAR_DEFAULT_OPEN,
            }))
        : filteredData
            .filter((r) => r.sends > 0)
            .map((r) => {
              const openRate = (100 * r.opens) / r.sends;
              return {
                correo: correoLabelUnified(r),
                openRate: Math.round(openRate * 10) / 10,
                opens: r.opens,
                sends: r.sends,
                fill: BAR_DEFAULT_OPEN,
              };
            });
    const rows = [...rawRows].sort((a, b) => b.openRate - a.openRate);
    const n = rows.length;
    const topCount = n > 0 ? Math.max(1, Math.ceil(n * 0.1)) : 0;
    const bottomCount = n > 0 ? Math.max(1, Math.ceil(n * 0.1)) : 0;
    rows.forEach((row, i) => {
      if (i < topCount) row.fill = BAR_BEST;
      else if (i >= n - bottomCount) row.fill = BAR_WORST;
    });
    return rows;
  }, [filteredData, filteredHubspotRows]);
  const clickRateByCorreo = useMemo(() => {
    const rawRows =
      filteredHubspotRows.length > 0
        ? filteredHubspotRows
            .filter((r) => r.sends > 0)
            .map((r) => ({
              correo: correoLabelHubSpot(r),
              clickRate: Math.round((100 * r.clicks) / r.sends * 10) / 10,
              clicks: r.clicks,
              sends: r.sends,
              fill: BAR_DEFAULT_CLICK,
            }))
        : filteredData
            .filter((r) => r.sends > 0)
            .map((r) => {
              const clickRate = (100 * r.clicks) / r.sends;
              return {
                correo: correoLabelUnified(r),
                clickRate: Math.round(clickRate * 10) / 10,
                clicks: r.clicks,
                sends: r.sends,
                fill: BAR_DEFAULT_CLICK,
              };
            });
    const rows = [...rawRows].sort((a, b) => b.clickRate - a.clickRate);
    const n = rows.length;
    const topCount = n > 0 ? Math.max(1, Math.ceil(n * 0.1)) : 0;
    const bottomCount = n > 0 ? Math.max(1, Math.ceil(n * 0.1)) : 0;
    rows.forEach((row, i) => {
      if (i < topCount) row.fill = BAR_BEST;
      else if (i >= n - bottomCount) row.fill = BAR_WORST;
    });
    return rows;
  }, [filteredData, filteredHubspotRows]);

  /** Gráfico 2: funnel simbólico. value = escala visual (embudo); realValue + pct en etiquetas. */
  const funnelSteps = useMemo(() => {
    const totals = filteredData.reduce(
      (acc, r) => ({
        sends: acc.sends + r.sends,
        opens: acc.opens + r.opens,
        clicks: acc.clicks + r.clicks,
        trials: acc.trials + (isFromFlujo(r) ? r.trials : 0),
        new_payments: acc.new_payments + r.new_payments,
      }),
      { sends: 0, opens: 0, clicks: 0, trials: 0, new_payments: 0 }
    );
    const base = totals.sends || 1;
    return [
      {
        name: "Enviados",
        value: 100,
        realValue: totals.sends,
        pct: 100,
        fill: FUNNEL_COLORS[0],
      },
      {
        name: "Aperturas",
        value: 78,
        realValue: totals.opens,
        pct: base > 0 ? (100 * totals.opens) / base : 0,
        fill: FUNNEL_COLORS[1],
      },
      {
        name: "Clicks",
        value: 56,
        realValue: totals.clicks,
        pct: base > 0 ? (100 * totals.clicks) / base : 0,
        fill: FUNNEL_COLORS[2],
      },
      {
        name: "Conversión a trial",
        value: 34,
        realValue: totals.trials,
        pct: base > 0 ? (100 * totals.trials) / base : 0,
        fill: FUNNEL_COLORS[3],
      },
      {
        name: "Conversión a new payment",
        value: 12,
        realValue: totals.new_payments,
        pct: base > 0 ? (100 * totals.new_payments) / base : 0,
        fill: FUNNEL_COLORS[4],
      },
    ];
  }, [filteredData]);

  if (data.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        Sube al menos un CSV (Trials, New Payments o HubSpot) para ver el full funnel.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <section className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <label htmlFor="canal" className="text-sm font-medium text-nimbus-text-high">
            Canal:
          </label>
          <select
            id="canal"
            value={canal}
            onChange={(e) => setCanal(e.target.value as CanalNormalizado | "todos")}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white min-w-[180px]"
          >
            <option value="todos">Todos los canales</option>
            {CANALES_ORDER.map((c) => (
              <option key={c} value={c}>
                {CANAL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="etapa" className="text-sm font-medium text-nimbus-text-high">
            Etapa del funnel:
          </label>
          <select
            id="etapa"
            value={etapa}
            onChange={(e) => setEtapa(e.target.value as EtapaFunnel | "todas")}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white min-w-[140px]"
          >
            <option value="todas">Todas</option>
            {ETAPAS_ORDER.map((e) => (
              <option key={e} value={e}>
                {ETAPA_LABELS[e]}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Gráfico 1: Eje X = correos enviados, Eje Y = etapa del funnel */}
      <section>
        <h3 className="text-base font-medium text-nimbus-text-high mb-3">
          Correos enviados por etapa del funnel
        </h3>
        <div className="h-72 bg-white rounded-lg border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sendsByEtapa}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 12 }} name="Correos enviados" />
              <YAxis type="category" dataKey="label" width={72} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [value.toFixed(0), "Enviados"]}
                labelFormatter={(label) => `Etapa: ${label}`}
              />
              <Bar dataKey="sends" name="Enviados" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="sends" position="right" formatter={(v: number) => v.toFixed(0)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Gráfico 2: Funnel + tabla lado a lado */}
      <section>
        <h3 className="text-base font-medium text-nimbus-text-high mb-3">
          Funnel: Enviados → Aperturas → Clicks → Trial → New payment
        </h3>
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="h-[28rem] w-full lg:max-w-xl shrink-0 bg-white rounded-lg border border-gray-200 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip
                  formatter={(value: number, _name: string, item: { payload?: { name: string; realValue: number; pct: number } }) => {
                    const p = item?.payload;
                    if (!p) return [String(value), _name];
                    return [
                      `${p.realValue.toLocaleString("es-MX")} (${p.pct.toFixed(1)}%)`,
                      p.name,
                    ];
                  }}
                  labelFormatter={() => null}
                />
                <Funnel
                  dataKey="value"
                  nameKey="name"
                  data={funnelSteps}
                  isAnimationActive={true}
                >
                  <LabelList
                    position="center"
                    fill="#fff"
                    stroke="none"
                    dataKey="name"
                    formatter={(value: string, _name: unknown, props: { payload?: { realValue: number; pct: number } }) => {
                      const p = props?.payload;
                      if (!p) return value;
                      return `${value}\n${p.realValue.toLocaleString("es-MX")} (${p.pct.toFixed(1)}%)`;
                    }}
                  />
                  {funnelSteps.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full lg:w-auto min-w-[240px] bg-white rounded-lg border border-gray-200 overflow-hidden shrink-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-nimbus-text-high">Métrica</th>
                  <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">Valor</th>
                  <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">%</th>
                </tr>
              </thead>
              <tbody>
                {funnelSteps.map((step, i) => (
                  <tr key={step.name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{step.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {step.realValue.toLocaleString("es-MX")}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                      {step.pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Gráfico 3: Open rate por correo (eje X = %, eje Y = correos). Open rate = aperturas / enviados * 100 */}
      <section>
        <h3 className="text-base font-medium text-nimbus-text-high mb-3">
          Open rate por correo ({openRateByCorreo.length} correos)
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          % de aperturas sobre enviados (open rate = aperturas ÷ enviados × 100). Eje X = %. Todos los correos del filtro actual ({openRateByCorreo.length}).
        </p>
        <p className="text-xs text-gray-500 mb-2 flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: BAR_BEST }} /> Mejor performance (top 10%)</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: BAR_WORST }} /> Peor performance (bottom 10%)</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: BAR_DEFAULT_OPEN }} /> Resto</span>
        </p>
        <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-auto" style={{ minHeight: 400, maxHeight: "80vh" }}>
          <ResponsiveContainer width="100%" height={Math.max(400, openRateByCorreo.length * 32)} minWidth={400}>
            <BarChart
              data={openRateByCorreo}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                name="Open rate %"
              />
              <YAxis
                type="category"
                dataKey="correo"
                width={380}
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <Tooltip
                formatter={(value: number, _name: string, item: { payload?: { opens: number; sends: number } }) => {
                  const p = item?.payload;
                  if (p) return [`${value}% (${p.opens.toLocaleString("es-MX")} aperturas / ${p.sends.toLocaleString("es-MX")} enviados)`, "Open rate"];
                  return [`${value}%`, "Open rate"];
                }}
                labelFormatter={(label) => (label ? `Nombre: ${label}` : "")}
                contentStyle={{ maxWidth: 480 }}
              />
              <Bar dataKey="openRate" name="Open rate %" radius={[0, 4, 4, 0]}>
                {openRateByCorreo.map((_, i) => (
                  <Cell key={i} fill={openRateByCorreo[i].fill} />
                ))}
                <LabelList dataKey="openRate" position="right" formatter={(v: number) => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Gráfico 4: Click rate por correo (eje X = %, eje Y = correos). Click rate = clics / enviados * 100 */}
      <section>
        <h3 className="text-base font-medium text-nimbus-text-high mb-3">
          Click rate por correo ({clickRateByCorreo.length} correos)
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          % de clics sobre enviados (click rate = clics ÷ enviados × 100). Eje X = %. Todos los correos del filtro actual ({clickRateByCorreo.length}).
        </p>
        <p className="text-xs text-gray-500 mb-2 flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: BAR_BEST }} /> Mejor performance (top 10%)</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: BAR_WORST }} /> Peor performance (bottom 10%)</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: BAR_DEFAULT_CLICK }} /> Resto</span>
        </p>
        <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-auto" style={{ minHeight: 400, maxHeight: "80vh" }}>
          <ResponsiveContainer width="100%" height={Math.max(400, clickRateByCorreo.length * 32)} minWidth={400}>
            <BarChart
              data={clickRateByCorreo}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                name="Click rate %"
              />
              <YAxis
                type="category"
                dataKey="correo"
                width={380}
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <Tooltip
                formatter={(value: number, _name: string, item: { payload?: { clicks: number; sends: number; correo?: string } }) => {
                  const p = item?.payload;
                  if (p) return [`${value}% (${p.clicks.toLocaleString("es-MX")} clics / ${p.sends.toLocaleString("es-MX")} enviados)`, "Click rate"];
                  return [`${value}%`, "Click rate"];
                }}
                labelFormatter={(label) => (label ? `Nombre: ${label}` : "")}
                contentStyle={{ maxWidth: 480 }}
              />
              <Bar dataKey="clickRate" name="Click rate %" radius={[0, 4, 4, 0]}>
                {clickRateByCorreo.map((_, i) => (
                  <Cell key={i} fill={clickRateByCorreo[i].fill} />
                ))}
                <LabelList dataKey="clickRate" position="right" formatter={(v: number) => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

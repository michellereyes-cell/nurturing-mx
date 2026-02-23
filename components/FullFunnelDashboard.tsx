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
import type { FilaUnificada, CanalNormalizado, EtapaFunnel } from "@/types";
import { CANAL_LABELS } from "@/lib/icp";

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

interface FullFunnelDashboardProps {
  data: FilaUnificada[];
}

export function FullFunnelDashboard({ data }: FullFunnelDashboardProps) {
  const [canal, setCanal] = useState<CanalNormalizado | "todos">("todos");
  const [etapa, setEtapa] = useState<EtapaFunnel | "todas">("todas");

  const filteredData = useMemo(() => {
    let list = data;
    if (canal !== "todos") list = list.filter((r) => r.canal === canal);
    if (etapa !== "todas") list = list.filter((r) => r.etapa === etapa);
    return list;
  }, [data, canal, etapa]);

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
    </div>
  );
}

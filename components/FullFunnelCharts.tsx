"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { FilaUnificada, EtapaFunnel } from "@/types";

const ETAPAS_ORDER: (EtapaFunnel | "sin-etapa")[] = ["tofu", "mofu", "bofu", "sin-etapa"];
const ETAPA_LABELS: Record<string, string> = {
  tofu: "TOFU",
  mofu: "MOFU",
  bofu: "BOFU",
  "sin-etapa": "Sin etapa",
};

interface FullFunnelChartsProps {
  data: FilaUnificada[];
}

/** Agrupa por etapa del funnel (tofu, mofu, bofu). */
function aggregateByEtapa(data: FilaUnificada[]): {
  etapa: string;
  label: string;
  sends: number;
  opens: number;
  clicks: number;
  trials: number;
  new_payments: number;
  openRate: number;
  ctr: number;
  trialConversion: number;
  paymentConversion: number;
}[] {
  const map = new Map<string, { sends: number; opens: number; clicks: number; trials: number; new_payments: number }>();

  for (const e of ETAPAS_ORDER) {
    map.set(e, { sends: 0, opens: 0, clicks: 0, trials: 0, new_payments: 0 });
  }

  for (const row of data) {
    const key = row.etapa ?? "sin-etapa";
    const cur = map.get(key) ?? map.get("sin-etapa")!;
    cur.sends += row.sends;
    cur.opens += row.opens;
    cur.clicks += row.clicks;
    cur.trials += row.trials;
    cur.new_payments += row.new_payments;
  }

  return ETAPAS_ORDER.map((etapa) => {
    const cur = map.get(etapa)!;
    const openRate = cur.sends > 0 ? (100 * cur.opens) / cur.sends : 0;
    const ctr = cur.sends > 0 ? (100 * cur.clicks) / cur.sends : 0;
    const trialConversion = cur.sends > 0 ? (100 * cur.trials) / cur.sends : 0;
    const paymentConversion = cur.trials > 0 ? (100 * cur.new_payments) / cur.trials : 0;
    return {
      etapa,
      label: ETAPA_LABELS[etapa],
      sends: cur.sends,
      opens: cur.opens,
      clicks: cur.clicks,
      trials: cur.trials,
      new_payments: cur.new_payments,
      openRate,
      ctr,
      trialConversion,
      paymentConversion,
    };
  });
}

export function FullFunnelCharts({ data }: FullFunnelChartsProps) {
  if (data.length === 0) {
    return (
      <p className="text-gray-500 text-center py-6">
        Sube al menos un CSV (Trials, New Payments o HubSpot) y asegúrate de que el cruce tenga datos por etapa (tofu, mofu, bofu en content/campaign).
      </p>
    );
  }

  const byEtapa = aggregateByEtapa(data);
  const hasHubSpot = data.some((r) => r.sends > 0 || r.opens > 0 || r.clicks > 0);
  const hasTableau = data.some((r) => r.trials > 0 || r.new_payments > 0);

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-nimbus-text-high">
        Full funnel (cruce HubSpot + Trials + New Payments)
      </h2>

      {/* Funnel por etapa: volumen */}
      <section>
        <h3 className="text-base font-medium text-nimbus-text-high mb-3">
          Volumen por etapa (TOFU → MOFU → BOFU)
        </h3>
        <div className="h-80 bg-white rounded-lg border border-gray-200 p-4 overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%" minWidth={400}>
            <BarChart
              data={byEtapa}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => [value.toFixed(0), name]}
                labelFormatter={(label) => `Etapa: ${label}`}
              />
              <Legend />
              {hasHubSpot && (
                <>
                  <Bar dataKey="sends" name="Enviados" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="opens" name="Aperturas" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="clicks" name="Clicks" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                </>
              )}
              {hasTableau && (
                <>
                  <Bar dataKey="trials" name="Trials" fill="#0059d5" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="new_payments" name="New Payments" fill="#00a650" radius={[0, 4, 4, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Conversión por etapa */}
      {(hasHubSpot || hasTableau) && (
        <section>
          <h3 className="text-base font-medium text-nimbus-text-high mb-3">
            % de conversión por etapa
          </h3>
          <div className="h-80 bg-white rounded-lg border border-gray-200 p-4 overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={400}>
              <BarChart
                data={byEtapa}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                  labelFormatter={(label) => `Etapa: ${label}`}
                />
                <Legend />
                {hasHubSpot && (
                  <>
                    <Bar dataKey="openRate" name="Open rate (aperturas/envíos)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ctr" name="CTR (clicks/envíos)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </>
                )}
                {hasTableau && (
                  <>
                    <Bar dataKey="trialConversion" name="Conversión a trial (trials/envíos)" fill="#0059d5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paymentConversion" name="Conversión a pago (pagos/trials)" fill="#00a650" radius={[4, 4, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Tabla resumen por etapa */}
      <section>
        <h3 className="text-base font-medium text-nimbus-text-high mb-3">
          Tabla por etapa (volumen y %)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-nimbus-text-high">Etapa</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">Enviados</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">Aperturas</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">Clicks</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">Trials</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">New Payments</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">Open rate %</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">CTR %</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">Trial conv. %</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">Pago conv. %</th>
              </tr>
            </thead>
            <tbody>
              {byEtapa.map((row) => (
                <tr key={row.etapa} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{row.label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.sends.toFixed(0)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.opens.toFixed(0)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.clicks.toFixed(0)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.trials.toFixed(0)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.new_payments.toFixed(0)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.openRate.toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.ctr.toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.trialConversion.toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.paymentConversion.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

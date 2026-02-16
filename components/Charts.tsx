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
import type { FilaUnificada } from "@/types";
import { CANAL_LABELS } from "@/lib/icp";

interface ChartsProps {
  data: FilaUnificada[];
}

export function Charts({ data }: ChartsProps) {
  if (data.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        Sube los 3 CSVs para ver los gráficos.
      </p>
    );
  }

  const byCampaign = aggregateByCampaign(data);
  const byCanal = aggregateByCanal(data);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
          Conversión por campaign (Trials + New Payments)
        </h2>
        <div className="h-80 bg-white rounded-lg border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCampaign} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="utm_campaign"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="trials" fill="#0059d5" name="Trials" />
              <Bar dataKey="new_payments" fill="#00a650" name="New Payments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
          Conversión por canal
        </h2>
        <div className="h-80 bg-white rounded-lg border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCanal} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="canal"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => CANAL_LABELS[v as keyof typeof CANAL_LABELS] ?? v}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [value, ""]}
                labelFormatter={(label) => CANAL_LABELS[label as keyof typeof CANAL_LABELS] ?? label}
              />
              <Legend />
              <Bar dataKey="trials" fill="#0059d5" name="Trials" />
              <Bar dataKey="new_payments" fill="#00a650" name="New Payments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
          Engagement por campaign (Opens / Clicks)
        </h2>
        <div className="h-80 bg-white rounded-lg border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCampaign} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="utm_campaign"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="opens" fill="#0059d5" name="Opens" />
              <Bar dataKey="clicks" fill="#00a650" name="Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
          Resumen (tabla)
        </h2>
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-nimbus-text-high">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left font-medium text-nimbus-text-high">
                  Canal
                </th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">
                  Trials
                </th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">
                  New Payments
                </th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">
                  Opens
                </th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">
                  Clicks
                </th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">
                  CTR
                </th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">
                  Spam
                </th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{row.utm_campaign}</td>
                  <td className="px-4 py-2 text-gray-800">
                    {CANAL_LABELS[row.canal]}
                  </td>
                  <td className="px-4 py-2 text-right">{row.trials}</td>
                  <td className="px-4 py-2 text-right">{row.new_payments}</td>
                  <td className="px-4 py-2 text-right">{row.opens}</td>
                  <td className="px-4 py-2 text-right">{row.clicks}</td>
                  <td className="px-4 py-2 text-right">{row.ctr.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{row.spam}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 50 && (
            <p className="px-4 py-2 text-xs text-gray-500">
              Mostrando 50 de {data.length} filas.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function aggregateByCampaign(data: FilaUnificada[]) {
  const map = new Map<
    string,
    { utm_campaign: string; trials: number; new_payments: number; opens: number; clicks: number }
  >();
  for (const row of data) {
    const k = row.utm_campaign;
    const cur = map.get(k) ?? {
      utm_campaign: k,
      trials: 0,
      new_payments: 0,
      opens: 0,
      clicks: 0,
    };
    cur.trials += row.trials;
    cur.new_payments += row.new_payments;
    cur.opens += row.opens;
    cur.clicks += row.clicks;
    map.set(k, cur);
  }
  return Array.from(map.values());
}

function aggregateByCanal(data: FilaUnificada[]) {
  const map = new Map<
    string,
    { canal: string; trials: number; new_payments: number }
  >();
  for (const row of data) {
    const k = row.canal;
    const cur = map.get(k) ?? {
      canal: k,
      trials: 0,
      new_payments: 0,
    };
    cur.trials += row.trials;
    cur.new_payments += row.new_payments;
    map.set(k, cur);
  }
  return Array.from(map.values());
}

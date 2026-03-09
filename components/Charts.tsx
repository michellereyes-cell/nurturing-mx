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

  const byCanal = aggregateByCanal(data);
  const totalTrials = byCanal.reduce((s, r) => s + r.trials, 0);
  const totalNp = byCanal.reduce((s, r) => s + r.new_payments, 0);
  const totalPct = totalTrials > 0 ? Math.round((100 * totalNp) / totalTrials * 10) / 10 : 0;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-nimbus-text-high mb-4">
          Conversión Trial a NP por canal
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
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-nimbus-text-high">Canal</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">Trials</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">New Payments</th>
                <th className="px-4 py-3 text-right font-medium text-nimbus-text-high">% Trial → NP</th>
              </tr>
            </thead>
            <tbody>
              {byCanal.map((row) => (
                <tr key={row.canal} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {CANAL_LABELS[row.canal as keyof typeof CANAL_LABELS] ?? row.canal}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.trials}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.new_payments}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium text-nimbus-primary">
                    {row.trialToNpPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{totalTrials}</td>
                <td className="px-4 py-3 text-right tabular-nums">{totalNp}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-nimbus-primary">
                  {totalPct.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function aggregateByCanal(data: FilaUnificada[]) {
  const map = new Map<
    string,
    { canal: string; trials: number; new_payments: number; trialToNpPct: number }
  >();
  for (const row of data) {
    const k = row.canal;
    const cur = map.get(k) ?? {
      canal: k,
      trials: 0,
      new_payments: 0,
      trialToNpPct: 0,
    };
    cur.trials += row.trials;
    cur.new_payments += row.new_payments;
    map.set(k, cur);
  }
  return Array.from(map.values()).map((row) => ({
    ...row,
    trialToNpPct: row.trials > 0 ? Math.round((100 * row.new_payments) / row.trials * 10) / 10 : 0,
  }));
}

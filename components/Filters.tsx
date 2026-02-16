"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CanalNormalizado, EtapaFunnel } from "@/types";
import { CANAL_LABELS } from "@/lib/icp";

const CANALES: CanalNormalizado[] = [
  "tienda-online",
  "redes-sociales",
  "marketplace",
  "tienda-fisica",
  "no-vendo",
  "no-sabemos",
  "venden",
];

const ETAPAS: EtapaFunnel[] = ["tofu", "mofu", "bofu"];

export function Filters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const canal = (searchParams.get("canal") ?? "") as CanalNormalizado | "";
  const etapa = (searchParams.get("etapa") ?? "") as EtapaFunnel | "";

  const setFilter = (key: "canal" | "etapa", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap gap-4 items-center mb-6">
      <div>
        <span className="text-sm font-medium text-gray-700 mr-2">Canal:</span>
        <select
          value={canal}
          onChange={(e) => setFilter("canal", e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-nimbus-text-high focus:border-nimbus-primary focus:outline-none focus:ring-1 focus:ring-nimbus-primary"
        >
          <option value="">Todos</option>
          {CANALES.map((c) => (
            <option key={c} value={c}>
              {CANAL_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="text-sm font-medium text-gray-700 mr-2">Etapa:</span>
        <select
          value={etapa}
          onChange={(e) => setFilter("etapa", e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-nimbus-text-high focus:border-nimbus-primary focus:outline-none focus:ring-1 focus:ring-nimbus-primary"
        >
          <option value="">Todas</option>
          {ETAPAS.map((e) => (
            <option key={e} value={e}>
              {e.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

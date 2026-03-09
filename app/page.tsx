"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { Filters } from "@/components/Filters";
import { TableauTables } from "@/components/TableauTables";
import { Charts } from "@/components/Charts";
import { FullFunnelDashboard } from "@/components/FullFunnelDashboard";
import { ComparacionMesAMes } from "@/components/ComparacionMesAMes";
import {
  parseTrialsCSV,
  parseNewPaymentsCSV,
  parseHubSpotCSV,
} from "@/lib/parseUploads";
import { mergeData } from "@/lib/merge";
import type { FilaUnificada, CanalNormalizado, EtapaFunnel } from "@/types";
import type { CustomCanalMap } from "@/lib/icp";
import { campaignToFlujoGroup, type CustomOrigenMap, type OrigenLabel } from "@/lib/flujoGroups";

type UploadSlot = "trials" | "newPayments" | "hubspot";
type TabId = "tablas" | "fullfunnel" | "comparacion";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [trialsText, setTrialsText] = useState("");
  const [npText, setNpText] = useState("");
  const [hubspotText, setHubspotText] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("tablas");
  const [customCanal, setCustomCanal] = useState<CustomCanalMap>({});
  const [customOrigen, setCustomOrigen] = useState<CustomOrigenMap>({});

  const handleLoad = (slot: UploadSlot, text: string) => {
    if (slot === "trials") setTrialsText(text);
    else if (slot === "newPayments") setNpText(text);
    else setHubspotText(text);
  };

  const trialsData = useMemo(() => (trialsText ? parseTrialsCSV(trialsText) : []), [trialsText]);
  const npData = useMemo(() => (npText ? parseNewPaymentsCSV(npText) : []), [npText]);
  const hubspotData = useMemo(() => (hubspotText ? parseHubSpotCSV(hubspotText) : []), [hubspotText]);

  const merged = useMemo(
    () => mergeData(trialsData, npData, hubspotData, { customCanal }),
    [trialsData, npData, hubspotData, customCanal]
  );

  const onAddCanal = useCallback((palabra: string, canal: CanalNormalizado) => {
    setCustomCanal((prev) => ({ ...prev, [palabra.trim()]: canal }));
  }, []);
  const onAddOrigen = useCallback((palabra: string, origen: OrigenLabel) => {
    setCustomOrigen((prev) => ({ ...prev, [palabra.trim()]: origen }));
  }, []);

  const canalParam = (searchParams.get("canal") ?? "") as CanalNormalizado | "";
  const etapaParam = (searchParams.get("etapa") ?? "") as EtapaFunnel | "";
  const origenParam = (searchParams.get("origen") ?? "") as OrigenLabel | "";

  const filtered: FilaUnificada[] = useMemo(() => {
    let list = merged;
    if (canalParam && ["tienda-online", "redes-sociales", "marketplace", "tienda-fisica", "no-vendo", "no-sabemos", "venden"].includes(canalParam)) {
      list = list.filter((r) => r.canal === canalParam);
    }
    if (activeTab === "tablas" && origenParam) {
      const opts = { customOrigen };
      list = list.filter((r) => campaignToFlujoGroup(r.utm_campaign, opts) === origenParam);
    }
    if (activeTab === "fullfunnel" && etapaParam && ["tofu", "mofu", "bofu"].includes(etapaParam)) {
      list = list.filter((r) => r.etapa === etapaParam);
    }
    return list;
  }, [merged, canalParam, etapaParam, origenParam, activeTab, customOrigen]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        trials: acc.trials + r.trials,
        new_payments: acc.new_payments + r.new_payments,
        opens: acc.opens + r.opens,
        clicks: acc.clicks + r.clicks,
        spam: acc.spam + r.spam,
      }),
      { trials: 0, new_payments: 0, opens: 0, clicks: 0, spam: 0 }
    );
  }, [filtered]);

  const hasData = trialsData.length > 0 || npData.length > 0 || hubspotData.length > 0;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FileUpload
          label="CSV Tableau – Trials"
          slot="trials"
          onLoad={handleLoad}
        />
        <FileUpload
          label="CSV Tableau – New Payments"
          slot="newPayments"
          onLoad={handleLoad}
        />
        <FileUpload
          label="CSV HubSpot (Nombre del correo, ENVIADOS, ABIERTOS, CLICK, etc.)"
          slot="hubspot"
          onLoad={handleLoad}
        />
      </section>

      {hubspotData.length > 0 && (
        <p className="text-sm text-gray-600">
          HubSpot cargado: <strong>{hubspotData.length}</strong> filas (envíos, aperturas, clics por correo).
        </p>
      )}

      <nav className="border-b border-gray-200" aria-label="Pestañas">
        <div className="flex gap-0">
          <button
            type="button"
            onClick={() => setActiveTab("tablas")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "tablas"
                ? "border-nimbus-primary text-nimbus-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Conversion Trials y NP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fullfunnel")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "fullfunnel"
                ? "border-nimbus-primary text-nimbus-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Full funnel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comparacion")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "comparacion"
                ? "border-nimbus-primary text-nimbus-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Comparación mes a mes
          </button>
        </div>
      </nav>

      {activeTab === "comparacion" && (
        <div className="pt-4">
          <ComparacionMesAMes customCanal={customCanal} customOrigen={customOrigen} />
        </div>
      )}

      {activeTab !== "comparacion" && hasData && (
        <>
          <Filters activeTab={activeTab} />
          <section className="bg-nimbus-surface rounded-lg border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-nimbus-text-high mb-2">
              Totales (filtrados)
            </h2>
            <div className="flex flex-wrap gap-6">
              <div>
                <span className="text-sm text-gray-600">Trials:</span>{" "}
                <span className="font-semibold text-nimbus-primary">
                  {totals.trials}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">New Payments:</span>{" "}
                <span className="font-semibold text-nimbus-success">
                  {totals.new_payments}
                </span>
              </div>
            </div>
          </section>

          {activeTab === "tablas" && (
            <div className="pt-4 space-y-8">
              {(trialsData.length > 0 || npData.length > 0) && (
                <TableauTables
                  trialsData={trialsData}
                  newPaymentsData={npData}
                  customCanal={customCanal}
                  customOrigen={customOrigen}
                  onAddCanal={onAddCanal}
                  onAddOrigen={onAddOrigen}
                />
              )}
              <Charts data={filtered} />
            </div>
          )}

          {activeTab === "fullfunnel" && (
            <div className="pt-4">
              <FullFunnelDashboard
                data={filtered}
                hubspotRows={hubspotData}
                trialsData={trialsData}
                newPaymentsData={npData}
                customCanal={customCanal}
                customOrigen={customOrigen}
              />
            </div>
          )}
        </>
      )}

      {activeTab !== "comparacion" && !hasData && (
        <p className="pt-4 text-sm text-gray-500">
          Sube al menos un CSV de Trials o New Payments (y opcionalmente HubSpot) para ver Conversion Trials y NP o Full funnel.
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="py-8 text-gray-500">Cargando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

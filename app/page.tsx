"use client";

import { useState, useMemo, Suspense } from "react";
import { FileUpload } from "@/components/FileUpload";
import { TableauTables } from "@/components/TableauTables";
import { FullFunnelDashboard } from "@/components/FullFunnelDashboard";
import { parseTrialsCSV, parseNewPaymentsCSV, parseHubSpotCSV } from "@/lib/parseUploads";
import { mergeData } from "@/lib/merge";

type UploadSlot = "trials" | "newPayments" | "hubspot";

type TabId = "tablas" | "fullfunnel";

function DashboardContent() {
  const [trialsText, setTrialsText] = useState("");
  const [npText, setNpText] = useState("");
  const [hubspotText, setHubspotText] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("tablas");

  const handleLoad = (slot: UploadSlot, text: string) => {
    if (slot === "trials") setTrialsText(text);
    else if (slot === "newPayments") setNpText(text);
    else setHubspotText(text);
  };

  const trialsData = useMemo(() => (trialsText ? parseTrialsCSV(trialsText) : []), [trialsText]);
  const npData = useMemo(() => (npText ? parseNewPaymentsCSV(npText) : []), [npText]);
  const hubspotData = useMemo(() => (hubspotText ? parseHubSpotCSV(hubspotText) : []), [hubspotText]);

  const mergedData = useMemo(
    () => mergeData(trialsData, npData, hubspotData),
    [trialsData, npData, hubspotData]
  );

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

      {hasData && (
        <>
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
                Tablas y gráficos
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
            </div>
          </nav>

          {activeTab === "tablas" && (
            <div className="pt-4">
              {(trialsData.length > 0 || npData.length > 0) && (
                <TableauTables trialsData={trialsData} newPaymentsData={npData} />
              )}
            </div>
          )}

          {activeTab === "fullfunnel" && (
            <div className="pt-4">
              <FullFunnelDashboard data={mergedData} />
            </div>
          )}
        </>
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

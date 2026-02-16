"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { Filters } from "@/components/Filters";
import { Charts } from "@/components/Charts";
import { TableauTables } from "@/components/TableauTables";
import {
  parseTrialsCSV,
  parseNewPaymentsCSV,
  parseHubSpotCSV,
} from "@/lib/parseUploads";
import { mergeData } from "@/lib/merge";
import type { FilaUnificada, CanalNormalizado, EtapaFunnel } from "@/types";

type UploadSlot = "trials" | "newPayments" | "hubspot";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [trialsText, setTrialsText] = useState("");
  const [npText, setNpText] = useState("");
  const [hubspotText, setHubspotText] = useState("");

  const handleLoad = (slot: UploadSlot, text: string) => {
    if (slot === "trials") setTrialsText(text);
    else if (slot === "newPayments") setNpText(text);
    else setHubspotText(text);
  };

  const trialsData = useMemo(() => (trialsText ? parseTrialsCSV(trialsText) : []), [trialsText]);
  const npData = useMemo(() => (npText ? parseNewPaymentsCSV(npText) : []), [npText]);

  const merged = useMemo(() => {
    if (!trialsText && !npText && !hubspotText) return [];
    const hubspot = hubspotText ? parseHubSpotCSV(hubspotText) : [];
    return mergeData(trialsData, npData, hubspot);
  }, [trialsText, npText, hubspotText, trialsData, npData]);

  const canalParam = (searchParams.get("canal") ?? "") as CanalNormalizado | "";
  const etapaParam = (searchParams.get("etapa") ?? "") as EtapaFunnel | "";

  const filtered: FilaUnificada[] = useMemo(() => {
    let list = merged;
    if (canalParam && ["tienda-online", "redes-sociales", "marketplace", "tienda-fisica", "no-vendo", "no-sabemos", "venden"].includes(canalParam)) {
      list = list.filter((r) => r.canal === canalParam);
    }
    if (etapaParam && ["tofu", "mofu", "bofu"].includes(etapaParam)) {
      list = list.filter((r) => r.etapa === etapaParam);
    }
    return list;
  }, [merged, canalParam, etapaParam]);

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
          label="CSV HubSpot (opens, clicks, CTR, spam)"
          slot="hubspot"
          onLoad={handleLoad}
        />
      </section>

      {(trialsData.length > 0 || npData.length > 0) && (
        <TableauTables trialsData={trialsData} newPaymentsData={npData} />
      )}

      {merged.length > 0 && (
        <>
          <Filters />
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
              <div>
                <span className="text-sm text-gray-600">Opens:</span>{" "}
                <span className="font-semibold">{totals.opens}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Clicks:</span>{" "}
                <span className="font-semibold">{totals.clicks}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Spam:</span>{" "}
                <span className="font-semibold text-nimbus-danger">
                  {totals.spam}
                </span>
              </div>
            </div>
          </section>
          <Charts data={filtered} />
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

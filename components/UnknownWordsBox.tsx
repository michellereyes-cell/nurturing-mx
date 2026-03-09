"use client";

import { useState, useMemo } from "react";
import type { CanalNormalizado } from "@/types";
import { CANAL_LABELS } from "@/lib/icp";
import { ORIGEN_LABELS, type OrigenLabel } from "@/lib/flujoGroups";
import { getUnknownWords } from "@/lib/unknownWords";
import type { FilaTableau } from "@/types";
import type { CustomCanalMap } from "@/lib/icp";
import type { CustomOrigenMap } from "@/lib/flujoGroups";

interface UnknownWordsBoxProps {
  trialsData: FilaTableau[];
  newPaymentsData: FilaTableau[];
  customCanal?: CustomCanalMap;
  customOrigen?: CustomOrigenMap;
  onAddCanal: (palabra: string, canal: CanalNormalizado) => void;
  onAddOrigen: (palabra: string, origen: OrigenLabel) => void;
}

const CANALES_ORDER: CanalNormalizado[] = [
  "tienda-online",
  "redes-sociales",
  "marketplace",
  "tienda-fisica",
  "no-vendo",
  "venden",
  "no-sabemos",
];

const MAX_VISIBLE = 100;

export function UnknownWordsBox({
  trialsData,
  newPaymentsData,
  customCanal = {},
  customOrigen = {},
  onAddCanal,
  onAddOrigen,
}: UnknownWordsBoxProps) {
  const { unknownCanal, unknownOrigen } = useMemo(
    () =>
      getUnknownWords(trialsData, newPaymentsData, customCanal, customOrigen),
    [trialsData, newPaymentsData, customCanal, customOrigen]
  );

  const [selectedCanal, setSelectedCanal] = useState<Set<string>>(new Set());
  const [selectedOrigen, setSelectedOrigen] = useState<Set<string>>(new Set());
  const [canalAsignar, setCanalAsignar] = useState<CanalNormalizado>("no-sabemos");
  const [origenAsignar, setOrigenAsignar] = useState<OrigenLabel>("Otros");

  const hayDesconocidas = unknownCanal.length > 0 || unknownOrigen.length > 0;
  const hayDatos = trialsData.length > 0 || newPaymentsData.length > 0;

  const toggleCanal = (v: string) => {
    setSelectedCanal((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const toggleOrigen = (v: string) => {
    setSelectedOrigen((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const selectAllCanal = () => {
    setSelectedCanal(new Set(unknownCanal));
  };
  const selectAllOrigen = () => {
    setSelectedOrigen(new Set(unknownOrigen));
  };
  const clearCanal = () => setSelectedCanal(new Set());
  const clearOrigen = () => setSelectedOrigen(new Set());

  const handleAsignarCanal = () => {
    selectedCanal.forEach((palabra) => onAddCanal(palabra, canalAsignar));
    setSelectedCanal(new Set());
  };

  const handleAsignarOrigen = () => {
    selectedOrigen.forEach((palabra) => onAddOrigen(palabra, origenAsignar));
    setSelectedOrigen(new Set());
  };

  if (!hayDatos) return null;

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-6">
      <h2 className="text-lg font-semibold text-nimbus-text-high">
        Palabras no reconocidas
      </h2>
      <p className="text-sm text-gray-600">
        Valores que no coinciden con ningún canal u origen conocido (se muestran como <strong>No sabemos</strong> / <strong>Otros</strong>).
        Selecciona varias y asígnalas en bloque para que se sumen bien en las tablas.
      </p>

      {hayDesconocidas ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canal: lista con checkboxes + asignar */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">
              Como canal (No sabemos) — {unknownCanal.length} valor(es)
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllCanal}
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
              >
                Seleccionar todas
              </button>
              <button
                type="button"
                onClick={clearCanal}
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
              >
                Quitar selección
              </button>
            </div>
            <ul className="max-h-48 overflow-y-auto border border-gray-200 rounded bg-white p-2 space-y-1 text-sm">
              {unknownCanal.slice(0, MAX_VISIBLE).map((v) => (
                <li key={v} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`canal-${v}`}
                    checked={selectedCanal.has(v)}
                    onChange={() => toggleCanal(v)}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor={`canal-${v}`}
                    className="truncate flex-1 cursor-pointer"
                    title={v}
                  >
                    {v || "(vacío)"}
                  </label>
                </li>
              ))}
              {unknownCanal.length > MAX_VISIBLE && (
                <li className="text-gray-500 text-xs">
                  … y {unknownCanal.length - MAX_VISIBLE} más (selecciona desde las primeras)
                </li>
              )}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={canalAsignar}
                onChange={(e) => setCanalAsignar(e.target.value as CanalNormalizado)}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {CANALES_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CANAL_LABELS[c]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAsignarCanal}
                disabled={selectedCanal.size === 0}
                className="px-4 py-2 rounded bg-nimbus-primary text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Asignar {selectedCanal.size > 0 ? `(${selectedCanal.size})` : ""} a canal
              </button>
            </div>
          </div>

          {/* Origen: lista con checkboxes + asignar */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">
              Como origen (Otros) — {unknownOrigen.length} valor(es)
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllOrigen}
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
              >
                Seleccionar todas
              </button>
              <button
                type="button"
                onClick={clearOrigen}
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
              >
                Quitar selección
              </button>
            </div>
            <ul className="max-h-48 overflow-y-auto border border-gray-200 rounded bg-white p-2 space-y-1 text-sm">
              {unknownOrigen.slice(0, MAX_VISIBLE).map((v) => (
                <li key={v} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`origen-${v}`}
                    checked={selectedOrigen.has(v)}
                    onChange={() => toggleOrigen(v)}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor={`origen-${v}`}
                    className="truncate flex-1 cursor-pointer"
                    title={v}
                  >
                    {v || "(vacío)"}
                  </label>
                </li>
              ))}
              {unknownOrigen.length > MAX_VISIBLE && (
                <li className="text-gray-500 text-xs">
                  … y {unknownOrigen.length - MAX_VISIBLE} más
                </li>
              )}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={origenAsignar}
                onChange={(e) => setOrigenAsignar(e.target.value as OrigenLabel)}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {ORIGEN_LABELS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
                <option value="Otros">Otros</option>
              </select>
              <button
                type="button"
                onClick={handleAsignarOrigen}
                disabled={selectedOrigen.size === 0}
                className="px-4 py-2 rounded bg-nimbus-primary text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Asignar {selectedOrigen.size > 0 ? `(${selectedOrigen.size})` : ""} a origen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2">
          No hay palabras sin clasificar con las reglas actuales.
        </p>
      )}
    </section>
  );
}

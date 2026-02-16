"use client";

type UploadSlot = "trials" | "newPayments" | "hubspot";

interface FileUploadProps {
  label: string;
  slot: UploadSlot;
  onLoad: (slot: UploadSlot, text: string) => void;
  fileName?: string;
}

export function FileUpload({ label, slot, onLoad, fileName }: FileUploadProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      onLoad(slot, text);
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      <label className="block text-sm font-medium text-nimbus-text-high mb-2">
        {label}
      </label>
      <input
        type="file"
        accept=".csv"
        onChange={handleChange}
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-nimbus-primary file:text-white file:font-medium hover:file:bg-nimbus-primary-hover"
      />
      {fileName && (
        <p className="mt-2 text-xs text-gray-500">Cargado: {fileName}</p>
      )}
    </div>
  );
}

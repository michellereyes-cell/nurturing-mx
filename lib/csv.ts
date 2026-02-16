export type ParseCSVOptions = {
  delimiter?: "," | "\t";
  /** Colapsa cabeceras tipo "c a m p a i g n" (artefacto UTF-16 leído como UTF-8) */
  normalizeHeaders?: boolean;
};

/**
 * Parsea un string CSV/TSV a array de objetos (primera fila = cabeceras).
 * Valida que no se ejecute código; solo lectura de datos.
 */
export function parseCSV(csvText: string, options?: ParseCSVOptions): Record<string, string>[] {
  let text = csvText.trim();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const delimiter = options?.delimiter ?? ",";
  const normalizeHeaders = options?.normalizeHeaders ?? false;

  const rawHeaders = parseCSVLine(lines[0] ?? "", delimiter);
  const headers = normalizeHeaders
    ? rawHeaders.map(normalizeHeader)
    : rawHeaders.map((h) => h.trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i] ?? "", delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

/** Colapsa espacios en cabeceras tipo "c a m p a i g n" (UTF-16 mal leído). */
function normalizeHeader(h: string): string {
  const t = h.trim();
  if (/^[\w()]\s[\w()](\s[\w()])*$/.test(t)) return t.replace(/\s/g, "");
  return t;
}

/** Parsea una línea CSV/TSV respetando comillas. */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else if (delimiter === "," && char === "\t" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** Obtiene valor numérico de una celda. Acepta coma decimal (0,5) y punto; ignora espacios. */
export function toNumber(value: string | undefined): number {
  if (value === undefined || value === "") return 0;
  let cleaned = String(value).replace(/\s/g, "").trim();
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(",", ".");
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Busca nombre de columna por posibles alias (case-insensitive). */
export function findColumn(
  row: Record<string, string>,
  aliases: string[]
): string | undefined {
  const keys = Object.keys(row);
  const lowerAliases = aliases.map((a) => a.toLowerCase());
  return keys.find((k) => lowerAliases.includes(k.toLowerCase())) ?? undefined;
}

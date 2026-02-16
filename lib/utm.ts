/**
 * Extrae utm_campaign y utm_content de una fila.
 * Acepta columnas directas o una URL con query string.
 */
export function extractUtmFromRow(row: Record<string, string>): {
  utm_campaign: string;
  utm_content: string;
} {
  const campaign =
    row["utm_campaign"] ??
    row["utm campaign"] ??
    row["campaign"] ??
    extractFromUrl(row["url"] ?? row["URL"] ?? row["link"] ?? "", "utm_campaign");
  const content =
    row["utm_content"] ??
    row["utm content"] ??
    row["content"] ??
    extractFromUrl(row["url"] ?? row["URL"] ?? row["link"] ?? "", "utm_content");

  return {
    utm_campaign: String(campaign ?? "").trim(),
    utm_content: String(content ?? "").trim(),
  };
}

function extractFromUrl(url: string, param: string): string {
  if (!url || !url.includes("?")) return "";
  try {
    const query = url.split("?")[1] ?? "";
    const params = new URLSearchParams(query);
    return params.get(param) ?? "";
  } catch {
    return "";
  }
}

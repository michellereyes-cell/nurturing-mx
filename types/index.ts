/** Canal normalizado por reglas ICP (7 valores; venden = flujos no segmentados) */
export type CanalNormalizado =
  | "tienda-online"
  | "redes-sociales"
  | "marketplace"
  | "tienda-fisica"
  | "no-vendo"
  | "no-sabemos"
  | "venden";

/** Etapa de funnel si existe en utm_content */
export type EtapaFunnel = "tofu" | "mofu" | "bofu";

/** Fila parseada de CSV Tableau (trials o new payments) */
export interface FilaTableau {
  utm_campaign: string;
  utm_content: string;
  valor: number; // trials o new_payments
}

/** Fila parseada de CSV HubSpot */
export interface FilaHubSpot {
  utm_campaign: string;
  utm_content: string;
  opens: number;
  clicks: number;
  ctr: number;
  spam: number;
}

/** Fila unificada por (campaign, canal) para el dashboard */
export interface FilaUnificada {
  utm_campaign: string;
  canal: CanalNormalizado;
  etapa?: EtapaFunnel;
  trials: number;
  new_payments: number;
  opens: number;
  clicks: number;
  ctr: number;
  spam: number;
}

/** Parámetros de filtro en URL */
export interface FiltrosURL {
  canal?: CanalNormalizado;
  etapa?: EtapaFunnel;
}

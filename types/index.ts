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
  /** Nombre completo del correo (ej. columna "Nombre del correo" en HubSpot) */
  nombre_correo?: string;
  sends: number;
  opens: number;
  clicks: number;
  ctr: number;
  spam: number;
  delivered?: number;
  unsubscribed?: number;
  omitted?: number;
}

/** Fila unificada por (campaign, canal) para el dashboard */
export interface FilaUnificada {
  utm_campaign: string;
  canal: CanalNormalizado;
  etapa?: EtapaFunnel;
  /** Nombre completo del correo cuando viene de HubSpot */
  nombre_correo?: string;
  trials: number;
  new_payments: number;
  sends: number;
  opens: number;
  clicks: number;
  ctr: number;
  spam: number;
  delivered?: number;
  unsubscribed?: number;
  omitted?: number;
}

/** Parámetros de filtro en URL */
export interface FiltrosURL {
  canal?: CanalNormalizado;
  etapa?: EtapaFunnel;
}

export type TipoGrafico = 'barras' | 'columnas' | 'lineas' | 'area' | 'torta';

export interface SerieDashboard {
  etiqueta: string;
  valor: number;
}

export interface MetricaDashboard {
  clave: string;
  etiqueta: string;
  valor: number;
  unidad?: string;
  variacion?: number;
  icono: string;
}

export interface TarjetaDashboard {
  id: string;
  titulo: string;
  descripcion: string;
  tipoGrafico: TipoGrafico;
  series: SerieDashboard[];
  permitidos: TipoGrafico[];
}

export interface DatosDashboard {
  contexto: 'personal' | 'empresa' | 'empresa-personal';
  titulo: string;
  subtitulo: string;
  metricas: MetricaDashboard[];
  tarjetas: TarjetaDashboard[];
}

export type EtiquetaConexion =
  | 'Llamar'
  | 'Seguir'
  | 'Escribir'
  | 'Agendar'
  | 'Presentar'
  | 'Revisar';

export type MedioConexion = 'NFC' | 'QR';

export interface SugerenciaNetworking {
  id: string;
  titulo: string;
  detalle: string;
  etiqueta: EtiquetaConexion;
  icono: string;
}

export interface ConexionReciente {
  id: string;
  persona: string;
  empresa: string;
  iniciales: string;
  medio: MedioConexion;
  toques: number;
  ultimoToque: string;
  etiqueta: EtiquetaConexion;
}

export const GRAFICOS: { valor: TipoGrafico; etiqueta: string; icono: string }[] = [
  { valor: 'barras', etiqueta: 'Barras', icono: 'fa-solid fa-chart-simple' },
  { valor: 'columnas', etiqueta: 'Columnas', icono: 'fa-solid fa-chart-column' },
  { valor: 'lineas', etiqueta: 'Líneas', icono: 'fa-solid fa-chart-line' },
  { valor: 'area', etiqueta: 'Área', icono: 'fa-solid fa-chart-area' },
  { valor: 'torta', etiqueta: 'Torta', icono: 'fa-solid fa-chart-pie' },
];

export const ETIQUETAS_CONEXION: { valor: EtiquetaConexion; icono: string }[] = [
  { valor: 'Llamar', icono: 'fa-solid fa-phone' },
  { valor: 'Seguir', icono: 'fa-solid fa-user-plus' },
  { valor: 'Escribir', icono: 'fa-solid fa-comment-dots' },
  { valor: 'Agendar', icono: 'fa-regular fa-calendar-check' },
  { valor: 'Presentar', icono: 'fa-solid fa-handshake' },
  { valor: 'Revisar', icono: 'fa-solid fa-clock-rotate-left' },
];

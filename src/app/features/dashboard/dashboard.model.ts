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

/** Los tipos de gráfico disponibles en el selector de cada tarjeta. */
export const GRAFICOS: { valor: TipoGrafico; etiqueta: string; icono: string }[] = [
  { valor: 'barras', etiqueta: 'Barras', icono: 'fa-solid fa-chart-simple' },
  { valor: 'columnas', etiqueta: 'Columnas', icono: 'fa-solid fa-chart-column' },
  { valor: 'lineas', etiqueta: 'Líneas', icono: 'fa-solid fa-chart-line' },
  { valor: 'area', etiqueta: 'Área', icono: 'fa-solid fa-chart-area' },
  { valor: 'torta', etiqueta: 'Torta', icono: 'fa-solid fa-chart-pie' },
];

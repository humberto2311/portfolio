export interface SerieAnalitica {
  etiqueta: string;
  valor: number;
}

export interface MetricaAnalitica {
  clave: string;
  etiqueta: string;
  valor: number;
  icono: string;
}

export interface AnaliticaPanel {
  contexto: 'personal' | 'empresa';
  titulo: string;
  subtitulo: string;
  desde: string;
  hasta: string;
  metricas: MetricaAnalitica[];
  visitasPorDia: SerieAnalitica[];
  origenes: SerieAnalitica[];
  clicsEnlaces: SerieAnalitica[];
  rendimientoEmpleados: SerieAnalitica[];
}

export interface HojaExportacion {
  titulo: string;
  encabezados: string[];
  filas: Array<Array<string | number>>;
  total: number;
}

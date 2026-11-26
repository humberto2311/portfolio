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
  ventasPos?: SerieAnalitica[];
  likesPorProyecto?: SerieAnalitica[];
  comentariosPorProyecto?: SerieAnalitica[];
  vistasPorProyecto?: SerieAnalitica[];
  seguimientoNfc?: SerieAnalitica[];
}

/** El estado que la persona pone a un contacto que conoció por un toque NFC. */
export type EstadoSeguimiento =
  | 'nuevo'
  | 'seguir'
  | 'llamar_despues'
  | 'reunion'
  | 'en_espera'
  | 'contactado'
  | 'descartado';

export interface FilaSeguimiento {
  contactoId: string;
  nombre: string | null;
  correo: string | null;
  estado: EstadoSeguimiento;
  nota: string | null;
  recordarEn: string | null;
  actualizadoEn: string | null;
}

export interface HojaExportacion {
  titulo: string;
  encabezados: string[];
  filas: Array<Array<string | number>>;
  total: number;
}

export interface Vacante {
  id?: number;
  cargo: string;
  empresa?: string | null;
  ubicacion?: string | null;
  modalidad?: string | null;
  salario?: string | null;
  enlace?: string | null;
  descripcion?: string | null;
  puntaje: number;
  nivel?: 'alta' | 'media' | 'baja' | null;
  origenPuntaje?: string | null;
  portal?: string | null;
  coincidencias: string[];
  faltantes: string[];
  sugerencias?: string[];
}

export interface GraficoItem {
  etiqueta: string;
  valor: number;
  nota?: string | null;
}

export interface GraficoDimension {
  clave: string;
  etiqueta: string;
  valor: number;
  maximo: number;
  porcentaje: number;
  items: GraficoItem[];
}

export interface Candidata {
  posicion: number;
  cargo: string;
  empresa?: string | null;
  ubicacion?: string | null;
  portal?: string | null;
  enlace?: string | null;
  probabilidad: number;
  brecha: number;
  coincidencias: string[];
  faltantes: string[];
}

export interface GraficoCv {
  desdeCv: boolean;
  titular?: string | null;
  resumen?: string | null;
  aniosExperiencia: number;
  indiceGeneral: number;
  dimensiones: GraficoDimension[];
  recomendaciones: string[];
  /** Vacantes ordenadas por probabilidad de pasar el filtro. */
  candidatas: Candidata[];
}

export interface BusquedaEmpleo {
  id?: number;
  termino: string;
  ciudad?: string | null;
  modalidad?: string | null;
  creadaEn?: string | null;
  expiraEn?: string | null;
  cacheada?: boolean | null;
  horasRestantes?: number | null;
  vacantes: number;
  mejorPuntaje: number;
  resultados: Vacante[];
  grafico?: GraficoCv | null;
  aviso?: string | null;
  filtroIa?: boolean | null;
  iaDisponible?: boolean | null;
}

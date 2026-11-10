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
  coincidencias: string[];
  faltantes: string[];
}

export interface BusquedaEmpleo {
  id?: number;
  termino: string;
  ciudad?: string | null;
  modalidad?: string | null;
  creadaEn?: string | null;
  vacantes: number;
  mejorPuntaje: number;
  resultados: Vacante[];
  aviso?: string | null;
}

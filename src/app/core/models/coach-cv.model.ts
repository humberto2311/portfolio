export interface CoachVacante {
  cargo: string;
  empresa?: string | null;
  puntaje?: number | null;
  faltantes?: string[];
}

export interface CoachCambioCv {
  resumen?: string | null;
  titular?: string | null;
  habilidades?: string[];
  tecnologias?: string[];
}

export interface CoachRespuesta {
  respuesta: string;
  indiceGeneral: number;
  mejoras: string[];
  vacantes: CoachVacante[];
  /** Solo llega cuando hay algo concreto que cambiar en el CV. */
  propuesta?: CoachCambioCv | null;
  /** true cuando el backend ya guardó los cambios en la hoja de vida. */
  aplicado?: boolean | null;
}

export interface CoachPeticion {
  preguntas: string[];
  vacantes: CoachVacante[];
  aplicar?: boolean;
}

export interface CoachMensaje {
  autor: 'ia' | 'yo';
  texto: string;
  hora: string;
  mejoras?: string[];
  propuesta?: CoachCambioCv | null;
}

export type PlantillaVcard = 'PERSONAL' | 'PROFESIONAL' | 'DIGITAL' | 'TOTAL';

export type CategoriaCampo = 'contacto' | 'redes' | 'enlaces' | 'empresa';

export interface CampoExtraVcard {
  clave: string;
  etiqueta: string;
  valor: string;
  categoria: CategoriaCampo;
}

export interface VCardPayload {
  id?: number;
  userProfileId?: string;
  plantilla: PlantillaVcard;
  nombre: string;
  puesto: string;
  empresa: string;
  telefono: string;
  email: string;
  web: string;
  linkedin: string;
  notas: string;
  campos: CampoExtraVcard[];
  creadoEn?: string;
  actualizadoEn?: string;
}

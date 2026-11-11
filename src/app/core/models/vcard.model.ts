export type PlantillaVcard =
  | 'PERSONAL'
  | 'PROFESIONAL'
  | 'DIGITAL'
  | 'TOTAL'
  | 'EMERGENCIA';

export type CategoriaCampo =
  | 'contacto'
  | 'redes'
  | 'enlaces'
  | 'empresa'
  | 'emergencia';

export interface CampoExtraVcard {
  clave: string;
  etiqueta: string;
  valor: string;
  categoria: CategoriaCampo;
}

export interface VCardPayload {
  id?: number;
  userProfileId?: string;

  /** Identificador público de la tarjeta (personal, profesional, emergencia…). */
  slug?: string;

  plantilla: PlantillaVcard;

  /** Solo una tarjeta por usuario puede ser la de por defecto. */
  porDefecto?: boolean;

  nombre: string;
  puesto: string;
  empresa: string;

  /** Empresa a la que pertenece la tarjeta. Vacío = tarjeta personal. */
  empresaId?: string | null;
  telefono: string;
  email: string;
  web: string;
  linkedin: string;
  notas: string;
  campos: CampoExtraVcard[];
}
export interface LinkItem {
  id: string;
  title: string;
  url: string;
  iconClass: string;
  description?: string;
  active: boolean;
  /** 'cv' | 'vcard' | undefined: los que genera la app, no se editan a mano. */
  kind?: string;
  /** Solo en 'cv': lectura en vivo del estado del perfil, no un campo del enlace. */
  isPublic?: boolean;
  profileId?: number;
  empresaId?: string;
  empresaSlug?: string;
  deEmpresa?: boolean;
  asignadoA?: string | null;
  asignadoNombre?: string | null;
}

export type LinkItemPayload = Omit<LinkItem, 'id' | 'createdAt' | 'updatedAt'>;
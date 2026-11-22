export interface LinkItem {
  id: string;
  title: string;
  url: string;
  iconClass: string;
  description?: string;
  active: boolean;
    kind?: string;
    isPublic?: boolean;
  profileId?: number;
  empresaId?: string;
  empresaSlug?: string;
  deEmpresa?: boolean;
  asignadoA?: string | null;
  asignadoNombre?: string | null;
  createdAt?: string;
}

export type LinkItemPayload = Omit<LinkItem, 'id' | 'createdAt' | 'updatedAt'>;

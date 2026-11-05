/** Perfil devuelto por el buscador de talento: datos públicos, sin información personal. */
export interface TalentoBuscado {
  id: string;
  fullName: string;
  gitUsername?: string | null;
  avatarUrl?: string | null;
  rol?: string | null;
  tecnologias: string[];
}

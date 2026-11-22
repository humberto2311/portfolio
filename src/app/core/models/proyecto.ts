export interface UserProfile {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;

}

export type ProjectSourceId =
  | 'github'
  | 'gitlab'
  | 'docker_hub'
  | 'behance'
  | 'dribbble'
  | 'figma'
  | 'manual';

export type ProjectGroupId = 'codigo' | 'contenedores' | 'diseno' | 'otros';

export interface Proyecto {
  id: number;
  name: string;
  description: string;
  shortBio: string;
  cloneUrl: string;
  homepage: string;
  imageUrl: string;
  lastCommitDate: string;
  stack: string[];
  branches: string[];
  userProfile?: UserProfile;
  isPublic?: boolean;
  sourceType?: ProjectSourceId;
  sourceGroup?: ProjectGroupId;
  sourceUrl?: string;
  hubVisible?: boolean;
  views?: number;
  likes?: number;
  comments?: number;
  likedByMe?: boolean;
}

export interface SocialProyecto {
  likes: number;
  likedByMe: boolean;
  comments: number;
  views: number;
}

export interface ComentarioProyecto {
  id: string;
  cardId: number;
  author: { id: string; fullName: string; gitUsername?: string; initials?: string };
  content: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
}

export interface ProveedorOAuth {
  id: string;
  nombre: string;
  url: string;
    login: boolean;
}

export interface FuenteProyecto {
  id: ProjectSourceId;
  group: ProjectGroupId;
  icon: string;
    porUsuario?: boolean;
    conectado?: boolean;
}

export interface ImportacionMasiva {
  sourceType: ProjectSourceId;
  username?: string | null;
}

export interface ImportacionProyecto {
  sourceType: ProjectSourceId;
  sourceUrl: string;
  name?: string;
  description?: string;
  shortBio?: string;
  imageUrl?: string;
  isPublic?: boolean;
}

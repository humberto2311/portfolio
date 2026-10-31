export interface Contacto {
  email: string;
  ubicacion: string;
  github: string;
}

export interface Experiencia {
  puesto: string;
  empresa: string;
  periodo: string;
  detalles: string;
}

export interface Estudio {
  titulo: string;
  institucion: string;
  periodo: string;
}

export interface PilaCategoria {
  categoria: string;
  tecnologias: string[];
}

export interface Proyecto {
  titulo: string;
  descripcion: string;
  tags: string[];
}

export interface Comentario {
  id: string;
  autor: string;
  iniciales: string;
  autorId?: string;
  autorUsername?: string;
  autorAvatar?: string;
  texto: string;
}

export interface Publicacion {
  id: string;
  autor: string;
  iniciales: string;
  autorId?: string;
  autorUsername?: string;
  autorAvatar?: string;
  tiempo: string;
  texto: string;
  imagen?: string;
  likes: number;
  compartidos: number;
  comentarios: Comentario[];
  liked?: boolean;
  /** Descripción que puso quien compartió el post (va encima del contenido). */
  descripcionCompartido?: string;
  /** Id del share aceptado (para editar/borrar su descripción). */
  shareId?: string;
  /** Quién compartió (solo esa persona puede editar la descripción). */
  shareSharedById?: string;
  /** Clave única de render (un post puede mostrarse como compartido y como original). */
  uid?: string;
}

export interface ContactoRed {
  id: string;
  nombre: string;
  rol: string;
  iniciales: string;
}

export interface PerfilData {
  id: string;
  nombre: string;
  rol: string;
  estado: string;
  iniciales: string;
  bio: string;
  contacto: Contacto;
  experiencia: Experiencia[];
  estudios: Estudio[];
  pilaTecnologica: PilaCategoria[];
  proyectos: Proyecto[];
  fotos: string[];
  contactos: ContactoRed[];
  coverUrl?: string;
  avatarUrl?: string;
}

export type TabId = 'publicaciones' | 'informacion' | 'fotos' | 'amigos';


// ===== DTOs del backend (coinciden con /v3/api-docs) =====

export interface AuthorDto {
  id: string;
  fullName: string;
  gitUsername?: string;
  initials?: string;
}

export interface CommentDto {
  id: string;
  postId: string;
  author: AuthorDto;
  content: string;
  createdAt: string;
}

export interface PostTagDto {
  id: string;
  postId: string;
  taggedUserId: string;
  taggedUserName?: string;
}

export interface PostDto {
  id: string;
  author: AuthorDto;
  content: string;
  imageUrl?: string;
  createdAt: string;
  likesCount: number;
  likedByMe: boolean;
  commentsCount: number;
  sharesCount: number;
  taggedUsers?: AuthorDto[];
  shareStatus?: string;
  shareMessage?: string;
  shareId?: string;
  shareSharedById?: string;
}

export interface ShareDto {
  id: string;
  post: PostDto;
  sharedBy: AuthorDto;
  targetProfile: AuthorDto;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  resolvedAt?: string;
}

/** Respuesta de /api/users/search y /api/users/{gitUsername} */
export interface UserProfileDto {
  id: string;
  fullName: string;
  gitUsername?: string;
  email?: string;
}

/** Respuesta de /api/users/connections/me/following */
export interface ConexionDto {
  id?: number;
  userId?: string;
  contactId: string;
  nombreUser?: string;
  usernameUser?: string;
  emailUser?: string;
  nombreContact?: string;
  usernameContact?: string;
  emailContact?: string;
  avatarUrl?: string;
  connectedAt?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface CreatePostRequest {
  content: string;
  imageUrl?: string;
  mentionedEmails?: string[];
  targetProfileId?: string;
}

export interface LikeToggleResponse {
  liked: boolean;
  likesCount: number;
}
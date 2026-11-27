export type TipoEstado = 'FOTO' | 'TEXTO';

export interface Estado {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioAvatar: string | null;
  tipo: TipoEstado;
  contenidoUrl: string | null;
  texto: string | null;
  textoEstilo: string | null;
  fondo: string | null;
  musicaTitulo: string | null;
  musicaArtista: string | null;
  musicaUrl: string | null;
  musicaInicio: number | null;
  stickers: string[];
  duracionSegundos: number | null;
  creadoEn: string;
  expiraEn: string;
  vista: boolean;
  vistas: number;
  propio: boolean;
  visibilidad?: string;
  soloMejoresAmigos?: boolean;
}

export interface Espectador {
  usuarioId: string;
  nombre: string;
  avatar: string | null;
  vistoEn: string | null;
}

export interface GrupoEstados {
  usuarioId: string;
  nombre: string;
  avatar: string | null;
  todosVistos: boolean;
  total: number;
  estados: Estado[];
}

export interface CrearEstado {
  tipo: TipoEstado;
  contenidoUrl?: string | null;
  texto?: string | null;
  textoEstilo?: string | null;
  fondo?: string | null;
  musicaId?: string | null;
  musicaTitulo?: string | null;
  musicaArtista?: string | null;
  musicaUrl?: string | null;
  musicaInicio?: number | null;
  stickers?: string[];
  duracionSegundos?: number;
  visibilidad?: string;
  audiencia?: { visibilidad: string; permitidos: string[]; excluidos: string[] };
}

export interface PistaMusica {
  id: string;
  titulo: string;
  artista: string;
  url: string;
  portada: string;
}

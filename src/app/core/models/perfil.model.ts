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
  id: number;
  autor: string;
  iniciales: string;
  texto: string;
}

export interface Publicacion {
  id: number;
  autor: string;
  iniciales: string;
  tiempo: string;
  texto: string;
  imagen?: string;
  likes: number;
  compartidos: number;
  comentarios: Comentario[];
  liked?: boolean;
}

export interface ContactoRed {
  nombre: string;
  rol: string;
  iniciales: string;
}

export interface PerfilData {
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
}

export type TabId = 'publicaciones' | 'informacion' | 'fotos' | 'amigos';
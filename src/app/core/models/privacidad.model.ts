export type Presencia = 'EN_LINEA' | 'AUSENTE' | 'NO_MOLESTAR' | 'INVISIBLE';
export type VisibilidadEstados = 'TODOS' | 'CONTACTOS' | 'NADIE';
export type AlcanceBloqueo = 'TODO' | 'CHAT' | 'ESTADOS' | 'PUBLICACIONES';

export interface Bloqueo {
  usuarioId: string;
  nombre: string;
  alcance: AlcanceBloqueo;
  creadoEn: string;
}

export interface Privacidad {
  presencia: Presencia;
  mostrarUltimaVez: boolean;
  estadosVisibilidad: VisibilidadEstados;
  bloqueados: Bloqueo[];
}

export const PRESENCIAS: Array<{ valor: Presencia; etiqueta: string; descripcion: string; icono: string; color: string }> = [
  { valor: 'EN_LINEA', etiqueta: 'En línea', descripcion: 'Tus contactos ven que estás disponible', icono: 'fa-circle', color: '#22c55e' },
  { valor: 'AUSENTE', etiqueta: 'Ausente', descripcion: 'Te muestras ausente hasta que vuelvas', icono: 'fa-moon', color: '#f59e0b' },
  { valor: 'NO_MOLESTAR', etiqueta: 'No molestar', descripcion: 'No recibirás notificaciones de escritorio', icono: 'fa-circle-minus', color: '#ef4444' },
  { valor: 'INVISIBLE', etiqueta: 'Invisible', descripcion: 'Aparecerás desconectado', icono: 'fa-circle', color: '#8b949e' }
];

export type VisibilidadContenido = 'PUBLICO' | 'MEJORES_AMIGOS' | 'SOLO_LISTA' | 'PRIVADO';

export const VISIBILIDADES: { valor: VisibilidadContenido; etiqueta: string; detalle: string }[] = [
  { valor: 'PUBLICO', etiqueta: 'Público', detalle: 'Cualquiera puede verlo' },
  { valor: 'MEJORES_AMIGOS', etiqueta: 'Mejores amigos', detalle: 'Solo tu lista de mejores amigos' },
  { valor: 'SOLO_LISTA', etiqueta: 'Solo personas que elijas', detalle: 'Nadie más lo verá' },
  { valor: 'PRIVADO', etiqueta: 'Solo yo', detalle: 'Nadie más lo verá' },
];

export interface AudienciaContenido {
  visibilidad: VisibilidadContenido;
  permitidos: string[];
  excluidos: string[];
}

export interface PersonaAudiencia {
  usuarioId: string;
  nombre: string;
  creadoEn: string;
}

export function audienciaVacia(): AudienciaContenido {
  return { visibilidad: 'PUBLICO', permitidos: [], excluidos: [] };
}

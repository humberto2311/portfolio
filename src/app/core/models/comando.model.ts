export interface ParametroComando {
  nombre: string;
  tipo: string;
  obligatorio: boolean;
  descripcion: string;
}

export interface ComandoDefinicion {
  nombre: string;
  categoria: string;
  descripcion: string;
  api: string;
  escritura: boolean;
  requiereConfirmacion: boolean;
  permiso: string;
  parametros: ParametroComando[];
  roles: string[];
  ejemplo: string;
}

export interface CategoriaComando {
  id: string;
  nombre: string;
  icono: string;
}

export interface BotComando {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  comandos: string[];
  activo: boolean;
  modoIa: boolean;
  conversacionId: string | null;
}

export interface CatalogoComandos {
  version: number;
  bots: Array<{ id: string; nombre: string; descripcion: string; icono: string; categorias: string[] }>;
  definiciones: Record<string, string>;
  roles: Record<string, string[]>;
  categorias: CategoriaComando[];
  comandos: ComandoDefinicion[];
  basesRoles: string[];
}

export interface RespuestaComando {
  ok: boolean;
  tipo: string;
  mensaje: string;
  comando: string | null;
  parametros: Record<string, unknown>;
  resumen: string | null;
  avisos: string[];
  ejecucionId: string | null;
  requiereConfirmacion: boolean;
}

export interface AuditoriaComando {
  id: string;
  comando: string;
  parametros: string;
  contextoChat: string;
  estado: string;
  escritura: boolean;
  api: string;
  respuestaResumen: string;
  creadoEn: string;
}

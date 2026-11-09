export type TipoEmpresa = 'LEGALMENTE_CONSTITUIDA' | 'MIPYME' | 'PERSONAL';

export type RolEmpresa = 'ADMIN' | 'EDITOR' | 'LECTOR' | 'VISOR';

export type EstadoDocumento = 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO';

export type TipoComponente =
  | 'TEXTO'
  | 'IMAGEN'
  | 'BOTON'
  | 'LISTA'
  | 'MENU'
  | 'PRODUCTO'
  | 'GALERIA'
  | 'CONTACTO'
  | 'HORARIO'
  | 'SEPARADOR'
  | 'HTML';

export interface OpcionEmpresa {
  valor: string;
  etiqueta: string;
  nivel?: number | null;
  exigeDocumentos?: boolean | null;
  exigeNumero?: boolean | null;
  ejemploNumero?: string | null;
}

export interface CatalogoEmpresa {
  tipos: OpcionEmpresa[];
  sectores: OpcionEmpresa[];
  roles: OpcionEmpresa[];
  documentos: OpcionEmpresa[];
}

export interface MiniUsuario {
  id: string;
  nombre?: string | null;
  usuario?: string | null;
  avatarUrl?: string | null;
}

export interface Empresa {
  id: string;
  nombre: string;
  razonSocial?: string | null;
  slug: string;
  nit?: string | null;
  tipo: TipoEmpresa;
  sector?: string | null;
  eslogan?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  correo?: string | null;
  sitioWeb?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  horario?: string | null;
  logoUrl?: string | null;
  portadaUrl?: string | null;
  certificada: boolean;
  publicada: boolean;
  publicadaEn?: string | null;
  creadaPor?: MiniUsuario | null;
  rolPropio?: RolEmpresa | null;
  rolEtiqueta?: string | null;
  documentosFaltantes: string[];
}

export interface EmpresaForm {
  nombre?: string | null;
  razonSocial?: string | null;
  slug?: string | null;
  nit?: string | null;
  tipo?: TipoEmpresa | null;
  sector?: string | null;
  eslogan?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  correo?: string | null;
  sitioWeb?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  horario?: string | null;
  logoUrl?: string | null;
  portadaUrl?: string | null;
}

export interface AccesoEmpresa {
  rol: RolEmpresa;
  rolEtiqueta: string;
  editaPerfil: boolean;
  gestionaEquipo: boolean;
  gestionaDocumentos: boolean;
  editaLienzo: boolean;
  creaComponentes: boolean;
  publica: boolean;
  veDocumentos: boolean;
  veBorradores: boolean;
}

export interface MiembroEmpresa {
  id: string;
  usuarioId: string;
  nombre: string;
  correo?: string | null;
  avatarUrl?: string | null;
  rol: RolEmpresa;
  rolEtiqueta: string;
  puesto?: string | null;
  visibleEnEquipo: boolean;
  propio: boolean;
}

export interface InvitarMiembro {
  correo: string;
  rol?: string | null;
  puesto?: string | null;
}

export interface ActualizarMiembro {
  rol?: string | null;
  puesto?: string | null;
  visibleEnEquipo?: boolean | null;
}

export interface DocumentoEmpresa {
  id: string;
  tipo: string;
  numero?: string | null;
  url: string;
  descripcion?: string | null;
  expedidoEn?: string | null;
  venceEn?: string | null;
  estado: EstadoDocumento;
  motivoRechazo?: string | null;
  vigente: boolean;
}

export interface DocumentoEmpresaForm {
  id?: string | null;
  tipo: string;
  numero?: string | null;
  url: string;
  descripcion?: string | null;
  expedidoEn?: string | null;
  venceEn?: string | null;
}

export interface CatalogoComponente {
  tipo: TipoComponente;
  etiqueta: string;
  contenidoObligatorio: string[];
  usaImagen: boolean;
}

export interface ComponenteLienzo {
  id?: string | null;
  tipo: TipoComponente;
  nombre?: string | null;
  contenido: string | null;
  estilo: string | null;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  capa: number;
  detras: boolean;
  visible: boolean;
  propio?: boolean | null;
  /** Ruta pública del componente: /empresa/{slug}/c/{id}. */
  enlace?: string | null;
  /** Diseño al que pertenece la pieza. */
  disenoId?: string | null;
}

export interface ContenidoTexto {
  texto: string;
  tamano?: number;
  peso?: number;
  color?: string;
  alineacion?: 'left' | 'center' | 'right';
}

export interface ContenidoImagen {
  url: string;
  alter?: string;
  radio?: number;
}

export interface ContenidoBoton {
  texto: string;
  enlace?: string;
  color?: string;
}

export interface ContenidoLista {
  titulo?: string;
  items: string[];
}

export interface ContenidoMenu {
  titulo?: string;
  grupoTitulo?: string;
  grupos: MenuGrupo[];
}

export interface MenuGrupo {
  titulo: string;
  items: MenuItem[];
}

export interface MenuItem {
  nombre: string;
  precio?: string;
  descripcion?: string;
  destacado?: boolean;
}

export interface ContenidoProducto {
  nombre: string;
  precio?: string;
  descripcion?: string;
  imagen?: string;
  enlace?: string;
}

export interface ContenidoGaleria {
  titulo?: string;
  imagenes: string[];
}

export interface ContenidoContacto {
  telefono?: string;
  whatsapp?: string;
  correo?: string;
  direccion?: string;
}

export interface ContenidoHtml {
  /** Documento HTML completo (normalmente generado por una IA) que se publica aislado. */
  html: string;
  alto?: number;
  titulo?: string;
  /** Solo diseño: HTML + CSS sin JavaScript ni controles (acordeones, botones, selects). */
  sinScripts?: boolean;
  /** cubrir = el HTML llena toda la pieza; seccion = ocupa solo su contenido y el resto queda libre. */
  ajuste?: 'cubrir' | 'seccion';
}

export interface ContenidoHorario {
  titulo?: string;
  filas: { dias: string; hora: string }[];
}

export interface EstiloComponente {
  color?: string;
  fondo?: string;
  radio?: number;
  tamano?: number;
  peso?: number;
  borde?: string;
  alineacion?: 'left' | 'center' | 'right';
  fuente?: string;
  sombra?: boolean;
  espaciado?: number;
  opacidad?: number;
}

export interface DisenoEmpresa {
  acento?: string | null;
  secundario?: string | null;
  fondoUrl?: string | null;
  css?: string | null;
  activo: boolean;
  errores?: string[];
}

/** Un diseño del lienzo: agrupa piezas y decide si se publica. */
export interface DisenoLienzo {
  id: string;
  empresaId: string;
  empresaNombre: string;
  empresaSlug: string;
  empresaLogoUrl?: string | null;
  nombre: string;
  tipo?: string | null;
  slug: string;
  descripcion?: string | null;
  publico: boolean;
  enlace: string;
  componentes?: number;
  /** Alto del lienzo en píxeles (el usuario lo alarga hacia abajo). */
  altoLienzo?: number | null;
  actualizadoEn?: string | null;
  piezas?: ComponenteLienzo[];
  errores?: string[];
}

/** Un diseño propio guardado en la carpeta, con el contexto de su empresa. */
export interface DisenoGuardadoCarpeta {
  id: string;
  empresaId: string;
  empresaNombre: string;
  empresaSlug: string;
  empresaLogoUrl?: string | null;
  tipo: TipoComponente;
  nombre?: string | null;
  contenido: string | null;
  estilo: string | null;
  ancho: number;
  alto: number;
  visible: boolean;
  detras: boolean;
  /** Código de la pieza para previsualizarla en la carpeta sin abrir otra página. */
  vista: ComponenteLienzo;
  /** Diseño al que pertenece (si lo tiene), para abrir su lienzo al editar. */
  disenoId?: string | null;
  enlace: string;
  actualizadaEn?: string | null;
}

export interface PanelEmpresa {
  empresa: Empresa;
  acceso: AccesoEmpresa;
  catalogo: CatalogoComponente[];
  miembros: MiembroEmpresa[];
  documentos: DocumentoEmpresa[];
  componentes: ComponenteLienzo[];
  diseno: DisenoEmpresa;
}

export interface EmpresaPublica {
  empresa: Empresa;
  diseno: DisenoEmpresa;
  componentes: ComponenteLienzo[];
  equipo: MiembroEmpresa[];
  /** Piezas publicadas que tienen su propio enlace (menús, tarjetas, HTML...). */
  piezas?: ComponenteLienzo[];
  /** Diseños públicos de la empresa. */
  disenos?: DisenoLienzo[];
}

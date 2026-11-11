import {
  EnlaceEspacio,
  EspacioEmpresa,
  SeccionEspacio,
  TipoEnlaceEspacio,
  TipoSeccionEspacio,
} from '../../../core/models/empresa.model';

export interface CatalogoSeccion {
  tipo: TipoSeccionEspacio;
  etiqueta: string;
  icono: string;
  descripcion: string;
}

export const CATALOGO_SECCIONES: CatalogoSeccion[] = [
  {
    tipo: 'PRESENTACION',
    etiqueta: 'Presentación',
    icono: 'fa-solid fa-flag',
    descripcion: 'Portada con el nombre, el lema y una frase de bienvenida.',
  },
  {
    tipo: 'SERVICIOS',
    etiqueta: 'Servicios',
    icono: 'fa-solid fa-list-check',
    descripcion: 'Una lista de servicios, cada uno con su descripción.',
  },
  {
    tipo: 'PRODUCTOS',
    etiqueta: 'Productos',
    icono: 'fa-solid fa-bag-shopping',
    descripcion: 'Productos o planes con nombre y descripción.',
  },
  {
    tipo: 'GALERIA',
    etiqueta: 'Galería',
    icono: 'fa-solid fa-images',
    descripcion: 'Fotos o imágenes en rejilla.',
  },
  {
    tipo: 'EQUIPO',
    etiqueta: 'Equipo',
    icono: 'fa-solid fa-users',
    descripcion: 'Las personas de la empresa que se muestran en el perfil.',
  },
  {
    tipo: 'TESTIMONIOS',
    etiqueta: 'Testimonios',
    icono: 'fa-solid fa-quote-left',
    descripcion: 'Lo que dicen tus clientes, un testimonio por línea.',
  },
  {
    tipo: 'PUBLICACIONES',
    etiqueta: 'Publicaciones',
    icono: 'fa-solid fa-newspaper',
    descripcion: 'Lo último que publicó la empresa en la red.',
  },
  {
    tipo: 'UBICACION',
    etiqueta: 'Ubicación',
    icono: 'fa-solid fa-location-dot',
    descripcion: 'Dirección, ciudad y horario de atención.',
  },
  {
    tipo: 'CONTACTO',
    etiqueta: 'Contacto',
    icono: 'fa-solid fa-address-book',
    descripcion: 'Teléfono, WhatsApp y correo con botones directos.',
  },
  {
    tipo: 'REDES',
    etiqueta: 'Redes sociales',
    icono: 'fa-solid fa-share-nodes',
    descripcion: 'Los enlaces a las redes de la empresa.',
  },
  {
    tipo: 'ENLACES',
    etiqueta: 'Enlaces',
    icono: 'fa-solid fa-link',
    descripcion: 'Botones a otras páginas, como un link hub.',
  },
  {
    tipo: 'LIENZO',
    etiqueta: 'Diseño del lienzo',
    icono: 'fa-solid fa-wand-magic-sparkles',
    descripcion: 'Un diseño publicado desde el diseñador visual.',
  },
];

export const ESTILOS_ESPACIO: { valor: string; etiqueta: string }[] = [
  { valor: 'CLASICO', etiqueta: 'Clásico' },
  { valor: 'REVISTA', etiqueta: 'Revista' },
  { valor: 'TARJETAS', etiqueta: 'Tarjetas' },
  { valor: 'OSCURO', etiqueta: 'Oscuro' },
];

export const ICONOS_ESPACIO: { valor: string; etiqueta: string }[] = [
  { valor: 'fa-solid fa-house', etiqueta: 'Inicio' },
  { valor: 'fa-solid fa-star', etiqueta: 'Estrella' },
  { valor: 'fa-solid fa-bolt', etiqueta: 'Rayo' },
  { valor: 'fa-solid fa-heart', etiqueta: 'Corazón' },
  { valor: 'fa-solid fa-briefcase', etiqueta: 'Maletín' },
  { valor: 'fa-solid fa-book', etiqueta: 'Libro' },
  { valor: 'fa-solid fa-envelope', etiqueta: 'Correo' },
  { valor: 'fa-solid fa-phone', etiqueta: 'Teléfono' },
  { valor: 'fa-solid fa-location-dot', etiqueta: 'Ubicación' },
  { valor: 'fa-solid fa-users', etiqueta: 'Equipo' },
  { valor: 'fa-solid fa-images', etiqueta: 'Galería' },
  { valor: 'fa-solid fa-bag-shopping', etiqueta: 'Tienda' },
];

export function etiquetaSeccion(tipo: TipoSeccionEspacio): string {
  return CATALOGO_SECCIONES.find((item) => item.tipo === tipo)?.etiqueta ?? tipo;
}

export function iconoSeccion(tipo: TipoSeccionEspacio): string {
  return CATALOGO_SECCIONES.find((item) => item.tipo === tipo)?.icono ?? 'fa-solid fa-shapes';
}

export function anclaDe(titulo: string | null | undefined, prefijo: string, orden: number): string {
  const base = (titulo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base || `${prefijo.toLowerCase()}-${orden}`;
}

export function anclaSeccion(seccion: SeccionEspacio): string {
  return anclaDe(seccion.titulo, seccion.tipo, seccion.orden);
}

export function slugLibre(valor: string, porDefecto: string): string {
  return anclaDe(valor, porDefecto, 0);
}

export function enlaceInicial(etiqueta: string, destino: string, tipo: TipoEnlaceEspacio = 'ANCLA'): EnlaceEspacio {
  return { etiqueta, tipo, destino, icono: null, visible: true };
}

export function seccionesIniciales(): SeccionEspacio[] {
  return [
    {
      tipo: 'PRESENTACION',
      titulo: 'Bienvenido',
      subtitulo: null,
      texto: 'Cuenta en pocas líneas qué hace tu empresa y por qué deberían conocerte.',
      orden: 0,
      visible: true,
      alineacion: 'left',
      estilo: null,
    },
    {
      tipo: 'SERVICIOS',
      titulo: 'Lo que hacemos',
      subtitulo: null,
      texto: 'Servicio uno\nDescripción corta del servicio.\n\nServicio dos\nDescripción corta del servicio.',
      orden: 1,
      visible: true,
      alineacion: 'left',
      estilo: null,
    },
    {
      tipo: 'EQUIPO',
      titulo: 'Nuestro equipo',
      subtitulo: null,
      texto: null,
      orden: 2,
      visible: true,
      alineacion: 'left',
      estilo: null,
    },
    {
      tipo: 'CONTACTO',
      titulo: 'Hablemos',
      subtitulo: null,
      texto: 'Escríbenos y te respondemos el mismo día.',
      orden: 3,
      visible: true,
      alineacion: 'left',
      estilo: null,
    },
  ];
}

export function navbarInicial(): EnlaceEspacio[] {
  return [
    enlaceInicial('Inicio', '#inicio'),
    enlaceInicial('Servicios', '#lo-que-hacemos'),
    enlaceInicial('Equipo', '#nuestro-equipo'),
    enlaceInicial('Contacto', '#hablemos'),
  ];
}

export function urlEnlace(enlace: EnlaceEspacio, slug: string, espacio: string): string {
  switch (enlace.tipo) {
    case 'EXTERNO':
      return enlace.destino;
    case 'RUTA':
      return enlace.destino.startsWith('/')
        ? enlace.destino.replace(':empresa', slug).replace(':espacio', espacio)
        : `/${enlace.destino}`;
    default:
      return enlace.destino.startsWith('#') ? enlace.destino : `#${enlace.destino}`;
  }
}

export function esExterno(enlace: EnlaceEspacio): boolean {
  return enlace.tipo === 'EXTERNO';
}

export function urlEspacio(slug: string, espacio: string): string {
  return `/empresa/${slug}/espacio/${espacio}`;
}

export function urlRed(slug: string): string {
  return `/empresa/${slug}`;
}

export function copiarEspacio(espacio: EspacioEmpresa): EspacioEmpresa {
  return {
    ...espacio,
    navbar: espacio.navbar.map((enlace) => ({ ...enlace })),
    secciones: espacio.secciones.map((seccion) => ({ ...seccion })),
  };
}

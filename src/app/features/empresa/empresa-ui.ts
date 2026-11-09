import {
  CatalogoEmpresa,
  ContenidoBoton,
  ContenidoContacto,
  ContenidoGaleria,
  ContenidoHorario,
  ContenidoImagen,
  ContenidoLista,
  ContenidoMenu,
  ContenidoProducto,
  ContenidoTexto,
  Empresa,
  EstiloComponente,
  RolEmpresa,
  TipoComponente,
} from '../../core/models/empresa.model';

export const LIENZO_ANCHO = 1200;
export const LIENZO_ALTO = 900;

export const FUENTES: { nombre: string; valor: string }[] = [
  { nombre: 'Moderna', valor: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { nombre: 'Clásica', valor: "Georgia, 'Times New Roman', serif" },
  { nombre: 'Editorial', valor: "'Playfair Display', Georgia, 'Times New Roman', serif" },
  { nombre: 'Humanista', valor: "'Trebuchet MS', 'Segoe UI', sans-serif" },
  { nombre: 'Monoespaciada', valor: "'Courier New', ui-monospace, monospace" },
  { nombre: 'Impacto', valor: "'Arial Black', Impact, sans-serif" },
  { nombre: 'Manuscrita', valor: "'Brush Script MT', 'Segoe Script', cursive" },
  { nombre: 'Compacta', valor: "'Arial Narrow', 'Roboto Condensed', sans-serif" },
];

export const PALETA_MARCA = [
  '#2563eb',
  '#0ea5e9',
  '#14b8a6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#111827',
  '#f8fafc',
];

export const ROLES_INFO: Record<RolEmpresa, { titulo: string; descripcion: string }> = {
  ADMIN: {
    titulo: 'Administrador',
    descripcion: 'Edita el perfil, el lienzo, el equipo, los documentos y publica la empresa.',
  },
  EDITOR: {
    titulo: 'Editor',
    descripcion: 'Edita el perfil empresarial y el lienzo, y publica los cambios.',
  },
  LECTOR: {
    titulo: 'Lector',
    descripcion: 'Crea y mueve sus propios componentes, que quedan como borrador hasta que un editor los publique.',
  },
  VISOR: {
    titulo: 'Visor',
    descripcion: 'Solo consulta la empresa y su entorno publicado.',
  },
};

export function leerJson<T>(valor: string | null | undefined, porDefecto: T): T {
  if (!valor) return porDefecto;

  try {
    const datos = JSON.parse(valor);
    return (datos ?? porDefecto) as T;
  } catch {
    return porDefecto;
  }
}

export function jsonDe(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  return JSON.stringify(valor);
}

export function contenidoInicial(tipo: TipoComponente): string | null {
  switch (tipo) {
    case 'TEXTO': {
      const contenido: ContenidoTexto = {
        texto: 'Escribe aquí el mensaje de tu empresa',
        tamano: 30,
        peso: 700,
        color: '#111827',
        alineacion: 'left',
      };
      return jsonDe(contenido);
    }
    case 'IMAGEN': {
      const contenido: ContenidoImagen = { url: '', alter: 'Imagen de la empresa', radio: 12 };
      return jsonDe(contenido);
    }
    case 'BOTON': {
      const contenido: ContenidoBoton = { texto: 'Conócenos', enlace: '#', color: '#2563eb' };
      return jsonDe(contenido);
    }
    case 'LISTA': {
      const contenido: ContenidoLista = {
        titulo: 'Lo que ofrecemos',
        items: ['Atención personalizada', 'Productos de calidad', 'Servicio a domicilio'],
      };
      return jsonDe(contenido);
    }
    case 'MENU': {
      const contenido: ContenidoMenu = {
        titulo: 'Nuestro menú',
        grupos: [
          {
            titulo: 'Para empezar',
            items: [
              { nombre: 'Entrada de la casa', precio: '$18.000', descripcion: 'Ingredientes frescos de temporada' },
              { nombre: 'Sopa del día', precio: '$14.000', descripcion: 'Preparada cada mañana' },
            ],
          },
          {
            titulo: 'Platos fuertes',
            items: [
              { nombre: 'Especialidad de la casa', precio: '$42.000', descripcion: 'La receta que nos representa', destacado: true },
              { nombre: 'Opción vegetariana', precio: '$36.000', descripcion: 'Con verduras locales' },
            ],
          },
        ],
      };
      return jsonDe(contenido);
    }
    case 'PRODUCTO': {
      const contenido: ContenidoProducto = {
        nombre: 'Producto destacado',
        precio: '$99.000',
        descripcion: 'Cuéntale a tus clientes qué hace especial este producto.',
        imagen: '',
        enlace: '',
      };
      return jsonDe(contenido);
    }
    case 'GALERIA': {
      const contenido: ContenidoGaleria = { titulo: 'Galería', imagenes: [] };
      return jsonDe(contenido);
    }
    case 'CONTACTO': {
      const contenido: ContenidoContacto = {
        telefono: '',
        whatsapp: '',
        correo: '',
        direccion: '',
      };
      return jsonDe(contenido);
    }
    case 'HORARIO': {
      const contenido: ContenidoHorario = {
        titulo: 'Horario de atención',
        filas: [
          { dias: 'Lunes a viernes', hora: '9:00 a. m. - 6:00 p. m.' },
          { dias: 'Sábados', hora: '9:00 a. m. - 1:00 p. m.' },
        ],
      };
      return jsonDe(contenido);
    }
    case 'SEPARADOR':
      return null;
  }
}

export function estiloInicial(tipo: TipoComponente): string {
  const base: EstiloComponente = {
    color: '#111827',
    radio: 12,
    alineacion: tipo === 'TEXTO' ? 'left' : 'center',
    fuente: FUENTES[0].valor,
  };

  if (tipo === 'SEPARADOR') {
    base.color = '#94a3b8';
    base.radio = 0;
  }

  return JSON.stringify(base);
}

export function tamanoInicial(tipo: TipoComponente): { ancho: number; alto: number } {
  switch (tipo) {
    case 'TEXTO':
      return { ancho: 420, alto: 120 };
    case 'IMAGEN':
      return { ancho: 360, alto: 260 };
    case 'BOTON':
      return { ancho: 220, alto: 64 };
    case 'LISTA':
      return { ancho: 340, alto: 240 };
    case 'MENU':
      return { ancho: 500, alto: 420 };
    case 'PRODUCTO':
      return { ancho: 380, alto: 300 };
    case 'GALERIA':
      return { ancho: 520, alto: 320 };
    case 'CONTACTO':
      return { ancho: 340, alto: 200 };
    case 'HORARIO':
      return { ancho: 360, alto: 220 };
    case 'SEPARADOR':
      return { ancho: 460, alto: 40 };
  }
}

export function iconoComponente(tipo: TipoComponente | string): string {
  switch (tipo) {
    case 'TEXTO':
      return 'fa-solid fa-font';
    case 'IMAGEN':
      return 'fa-solid fa-image';
    case 'BOTON':
      return 'fa-solid fa-hand-pointer';
    case 'LISTA':
      return 'fa-solid fa-list';
    case 'MENU':
      return 'fa-solid fa-book-open';
    case 'PRODUCTO':
      return 'fa-solid fa-bag-shopping';
    case 'GALERIA':
      return 'fa-solid fa-images';
    case 'CONTACTO':
      return 'fa-solid fa-address-book';
    case 'HORARIO':
      return 'fa-solid fa-clock';
    case 'SEPARADOR':
      return 'fa-solid fa-minus';
    default:
      return 'fa-solid fa-shapes';
  }
}

export function documentosExigidos(tipo: string | null | undefined, sector: string | null | undefined): string[] {
  if (tipo === 'PERSONAL') return [];

  const requeridos = ['RUT', 'MATRICULA_MERCANTIL'];

  if (tipo === 'LEGALMENTE_CONSTITUIDA') requeridos.push('ACTA_REPRESENTACION_LEGAL');

  if (sector === 'RESTAURANTE' || sector === 'TIENDA' || sector === 'HOTEL') {
    requeridos.push('LICENCIA_COMERCIO');
  }

  if (sector === 'HOTEL') requeridos.push('RNT');

  return requeridos;
}

export function etiquetaOpcion(
  catalogo: CatalogoEmpresa | null,
  grupo: 'tipos' | 'sectores' | 'roles' | 'documentos',
  valor: string | null | undefined,
): string {
  if (!valor) return '';
  return catalogo?.[grupo].find((opcion) => opcion.valor === valor)?.etiqueta ?? valor;
}

export function etiquetaTipoEmpresa(empresa: Empresa | null): string {
  if (!empresa) return '';
  switch (empresa.tipo) {
    case 'LEGALMENTE_CONSTITUIDA':
      return 'Legalmente constituida';
    case 'MIPYME':
      return 'Mipyme';
    case 'PERSONAL':
      return 'Personal';
    default:
      return empresa.tipo;
  }
}

export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function leerImagen(file: File, maximoBytes = 1_400_000): Promise<string> {
  return new Promise((resolver, rechazar) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      rechazar(new Error('La imagen debe ser PNG, JPG o WEBP.'));
      return;
    }
    if (file.size > maximoBytes) {
      rechazar(new Error('La imagen pesa demasiado. Usa una de hasta 1,4 MB.'));
      return;
    }

    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(new Error('No se pudo leer la imagen.'));
    lector.readAsDataURL(file);
  });
}

export function esImagenData(url: string | null | undefined): boolean {
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(url ?? '');
}

export function origenPublico(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/empresa`;
}

export function porcentaje(valor: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((valor / total) * 100)));
}

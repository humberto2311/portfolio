export interface ProductoPos {
  id: string;
  nombre: string;
  precio: number;
  categoria: string | null;
  activo: boolean;
  creadoEn: string;
}

export interface ItemOrdenPos {
  id: string;
  productoId: string | null;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export type EstadoOrdenPos = 'ABIERTA' | 'PAGADA' | 'CANCELADA';

export interface OrdenPos {
  id: string;
  empresaId: string;
  contactoId: string | null;
  empleadoId: string | null;
  estado: EstadoOrdenPos;
  origen: 'NATIVO' | 'WEBHOOK';
  subtotal: number;
  impuesto: number;
  total: number;
  referenciaExterna: string | null;
  creadoEn: string;
  cerradoEn: string | null;
  items: ItemOrdenPos[];
}

export interface PaginaOrdenes {
  total: number;
  pagina: number;
  ordenes: OrdenPos[];
}

export interface ResumenPos {
  desde: string;
  hasta: string;
  totalVendido: number;
  ordenesPagadas: number;
  porEmpleado: Array<{ empleado: string; total: number }>;
}

export interface IntegracionPos {
  url: string;
  tokenPista: string;
  configurado: boolean;
}

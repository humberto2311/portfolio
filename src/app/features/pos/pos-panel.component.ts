import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresaService } from '../../core/services/empresa.service';
import { PosService } from '../../core/services/pos.service';
import { IntegracionPos, OrdenPos, ProductoPos, ResumenPos } from '../../core/models/pos.model';

type Pestana = 'ventas' | 'catalogo' | 'integracion';

interface LineaTicket {
  producto: ProductoPos;
  cantidad: number;
}

@Component({
  selector: 'app-pos-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos-panel.component.html',
  styleUrls: ['./pos-panel.component.scss']
})
export class PosPanelComponent implements OnInit {

  private empresas = inject(EmpresaService);
  private pos = inject(PosService);

  readonly pestana = signal<Pestana>('ventas');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly productos = signal<ProductoPos[]>([]);
  readonly ordenes = signal<OrdenPos[]>([]);
  readonly resumen = signal<ResumenPos | null>(null);
  readonly integracion = signal<IntegracionPos | null>(null);
  readonly tokenNuevo = signal<string | null>(null);

  readonly filtroEstado = signal('');
  readonly filtroDesde = signal('');
  readonly filtroHasta = signal('');

  readonly ticket = signal<LineaTicket[]>([]);
  readonly impuesto = signal(0);

  readonly editando = signal<ProductoPos | null>(null);
  readonly formProducto = signal<{ nombre: string; precio: number | null; categoria: string; activo: boolean }>({
    nombre: '',
    precio: null,
    categoria: '',
    activo: true
  });

  readonly empresaId = computed(() => this.empresas.empresaActual()?.id ?? null);

  readonly totalTicket = computed(() =>
    this.ticket().reduce((suma, linea) => suma + linea.producto.precio * linea.cantidad, 0)
  );

  readonly impuestoCalculado = computed(() =>
    (this.totalTicket() * (this.impuesto() || 0)) / 100
  );

  readonly totalConImpuesto = computed(() => this.totalTicket() + this.impuestoCalculado());

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    const empresaId = this.empresaId();
    if (!empresaId) return;

    this.cargando.set(true);
    this.error.set(null);

    this.pos.productos(empresaId).subscribe({
      next: (productos) => this.productos.set(productos ?? []),
      error: () => this.error.set('No se pudo cargar el catálogo.')
    });

    this.cargarOrdenes();
    this.pos.resumen(empresaId).subscribe({
      next: (resumen) => this.resumen.set(resumen),
      error: () => undefined
    });

    this.pos.integracion(empresaId).subscribe({
      next: (integracion) => this.integracion.set(integracion),
      error: () => undefined
    });

    this.cargando.set(false);
  }

  cargarOrdenes(): void {
    const empresaId = this.empresaId();
    if (!empresaId) return;

    this.pos.ordenes(empresaId, this.filtroEstado() || undefined,
      this.filtroDesde() || undefined, this.filtroHasta() || undefined).subscribe({
      next: (pagina) => this.ordenes.set(pagina.ordenes ?? []),
      error: () => this.error.set('No se pudieron cargar las ventas.')
    });
  }

  cambiarPestana(pestana: Pestana): void {
    this.pestana.set(pestana);
  }

  agregarAlTicket(producto: ProductoPos): void {
    const actuales = this.ticket();
    const existente = actuales.find((linea) => linea.producto.id === producto.id);

    if (existente) {
      this.ticket.set(actuales.map((linea) =>
        linea.producto.id === producto.id ? { ...linea, cantidad: linea.cantidad + 1 } : linea));
      return;
    }

    this.ticket.set([...actuales, { producto, cantidad: 1 }]);
  }

  quitarDelTicket(productoId: string): void {
    this.ticket.set(this.ticket().filter((linea) => linea.producto.id !== productoId));
  }

  cambiarCantidad(productoId: string, cantidad: number): void {
    if (cantidad <= 0) {
      this.quitarDelTicket(productoId);
      return;
    }
    this.ticket.set(this.ticket().map((linea) =>
      linea.producto.id === productoId ? { ...linea, cantidad } : linea));
  }

  cobrar(): void {
    const empresaId = this.empresaId();
    const lineas = this.ticket();
    if (!empresaId || lineas.length === 0) return;

    this.pos.crearOrden(empresaId, {
      impuestoPorcentaje: this.impuesto(),
      items: lineas.map((linea) => ({
        productoId: linea.producto.id,
        nombre: linea.producto.nombre,
        cantidad: linea.cantidad,
        precioUnitario: linea.producto.precio
      }))
    }).subscribe({
      next: (orden) => {
        this.pos.pagar(empresaId, orden.id).subscribe({
          next: () => {
            this.ticket.set([]);
            this.aviso.set('Venta registrada y cobrada.');
            this.cargarTodo();
          },
          error: () => this.error.set('La orden se creó pero no se pudo cobrar.')
        });
      },
      error: () => this.error.set('No se pudo crear la orden.')
    });
  }

  pagarOrden(orden: OrdenPos): void {
    const empresaId = this.empresaId();
    if (!empresaId) return;

    this.pos.pagar(empresaId, orden.id).subscribe({
      next: () => {
        this.aviso.set('Orden cobrada.');
        this.cargarTodo();
      },
      error: (err) => this.error.set(err?.error?.error ?? 'No se pudo cobrar la orden.')
    });
  }

  cancelarOrden(orden: OrdenPos): void {
    const empresaId = this.empresaId();
    if (!empresaId) return;

    this.pos.cancelar(empresaId, orden.id).subscribe({
      next: () => {
        this.aviso.set('Orden cancelada.');
        this.cargarTodo();
      },
      error: (err) => this.error.set(err?.error?.error ?? 'No se pudo cancelar la orden.')
    });
  }

  cambiarCampo(campo: 'nombre' | 'precio' | 'categoria' | 'activo', valor: string | number | boolean | null): void {
    this.formProducto.set({ ...this.formProducto(), [campo]: valor });
  }

  editar(producto: ProductoPos | null): void {
    this.editando.set(producto);
    this.formProducto.set(producto
      ? { nombre: producto.nombre, precio: producto.precio, categoria: producto.categoria ?? '', activo: producto.activo }
      : { nombre: '', precio: null, categoria: '', activo: true });
  }

  guardarProducto(): void {
    const empresaId = this.empresaId();
    const form = this.formProducto();
    if (!empresaId || !form.nombre.trim() || form.precio === null) return;

    const cuerpo = {
      nombre: form.nombre.trim(),
      precio: form.precio,
      categoria: form.categoria || null,
      activo: form.activo
    };

    const actual = this.editando();
    const peticion = actual
      ? this.pos.editarProducto(empresaId, actual.id, cuerpo)
      : this.pos.crearProducto(empresaId, cuerpo);

    peticion.subscribe({
      next: () => {
        this.editar(null);
        this.aviso.set(actual ? 'Producto actualizado.' : 'Producto creado.');
        this.cargarTodo();
      },
      error: (err) => this.error.set(err?.error?.error ?? 'No se pudo guardar el producto.')
    });
  }

  borrarProducto(producto: ProductoPos): void {
    const empresaId = this.empresaId();
    if (!empresaId) return;

    this.pos.borrarProducto(empresaId, producto.id).subscribe({
      next: () => {
        this.aviso.set('Producto eliminado.');
        this.cargarTodo();
      },
      error: () => this.error.set('No se pudo eliminar el producto.')
    });
  }

  rotarToken(): void {
    const empresaId = this.empresaId();
    if (!empresaId) return;

    this.pos.rotarToken(empresaId).subscribe({
      next: (respuesta) => {
        this.tokenNuevo.set(respuesta.token);
        this.pos.integracion(empresaId).subscribe({
          next: (integracion) => this.integracion.set(integracion)
        });
      },
      error: () => this.error.set('No se pudo generar el token.')
    });
  }

  copiar(valor: string): void {
    navigator.clipboard.writeText(valor).then(() => this.aviso.set('Copiado al portapapeles.'));
  }

  urlCompleta(): string {
    const url = this.integracion()?.url ?? '';
    return url.startsWith('http') ? url : `${location.origin}${url}`;
  }

  claseEstado(estado: string): string {
    return estado === 'PAGADA' ? 'estado--ok' : estado === 'CANCELADA' ? 'estado--no' : 'estado--abierta';
  }
}

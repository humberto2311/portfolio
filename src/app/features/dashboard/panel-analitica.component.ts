import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AnaliticaPanel,
  EstadoSeguimiento,
  FilaSeguimiento,
  HojaExportacion,
  SerieAnalitica,
} from '../../core/models/analitica.model';
import { AnaliticaService } from '../../core/services/analitica.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { DashboardGraficoComponent } from './dashboard-grafico.component';
import { DatosDashboard, SerieDashboard, TarjetaDashboard, TipoGrafico } from './dashboard.model';

const TODOS: TipoGrafico[] = ['barras', 'columnas', 'lineas', 'area', 'torta'];

/** Los estados que la persona puede ponerle a un contacto que conoció por NFC. */
const ESTADOS_SEGUIMIENTO: { valor: EstadoSeguimiento; etiqueta: string; icono: string }[] = [
  { valor: 'nuevo', etiqueta: 'Nuevo', icono: 'fa-solid fa-sparkles' },
  { valor: 'seguir', etiqueta: 'Seguir', icono: 'fa-solid fa-user-plus' },
  { valor: 'llamar_despues', etiqueta: 'Llamar después', icono: 'fa-solid fa-phone' },
  { valor: 'reunion', etiqueta: 'Agendar reunión', icono: 'fa-solid fa-calendar-plus' },
  { valor: 'en_espera', etiqueta: 'En espera', icono: 'fa-solid fa-hourglass-half' },
  { valor: 'contactado', etiqueta: 'Ya contactado', icono: 'fa-solid fa-check' },
  { valor: 'descartado', etiqueta: 'Descartar', icono: 'fa-solid fa-xmark' },
];

/** Qué se ve en cada vista. Cada métrica tiene su propio botón. */
type Modo = 'red' | 'empresa' | 'mi-aporte';

type Vista = 'resumen' | 'visitas' | 'origenes' | 'enlaces' | 'ventas' | 'proyectos'
  | 'proyectos-social' | 'seguimiento' | 'equipo';

interface EntradaRiel {
  vista: Vista;
  etiqueta: string;
  icono: string;
  grupo: string;
}

/**
 * Cada modo tiene sus propias métricas: la información de la empresa no es la misma
 * que la de la persona. En la empresa, por ejemplo, no existen los proyectos.
 */
const METRICAS_PERSONAL: EntradaRiel[] = [
  { vista: 'resumen', etiqueta: 'Resumen', icono: 'fa-solid fa-gauge-high', grupo: 'General' },
  { vista: 'visitas', etiqueta: 'Visitas al perfil', icono: 'fa-solid fa-eye', grupo: 'General' },
  { vista: 'origenes', etiqueta: 'De dónde llegan', icono: 'fa-solid fa-arrow-right-to-bracket', grupo: 'General' },
  { vista: 'enlaces', etiqueta: 'Clics en enlaces', icono: 'fa-solid fa-link', grupo: 'General' },
  { vista: 'proyectos', etiqueta: 'Mis proyectos', icono: 'fa-solid fa-diagram-project', grupo: 'Contenido' },
  { vista: 'seguimiento', etiqueta: 'Seguimiento NFC', icono: 'fa-solid fa-wifi', grupo: 'Contactos' },
];

const METRICAS_EMPRESA: EntradaRiel[] = [
  { vista: 'resumen', etiqueta: 'Resumen', icono: 'fa-solid fa-gauge-high', grupo: 'General' },
  { vista: 'visitas', etiqueta: 'Visitas a la empresa', icono: 'fa-solid fa-eye', grupo: 'General' },
  { vista: 'origenes', etiqueta: 'De dónde llegan', icono: 'fa-solid fa-arrow-right-to-bracket', grupo: 'General' },
  { vista: 'enlaces', etiqueta: 'Clics en enlaces', icono: 'fa-solid fa-link', grupo: 'General' },
  { vista: 'ventas', etiqueta: 'Ventas del POS', icono: 'fa-solid fa-cash-register', grupo: 'Negocio' },
  { vista: 'equipo', etiqueta: 'Equipo', icono: 'fa-solid fa-users', grupo: 'Equipo' },
];

const METRICAS_MI_APORTE: EntradaRiel[] = [
  { vista: 'resumen', etiqueta: 'Resumen', icono: 'fa-solid fa-gauge-high', grupo: 'General' },
  { vista: 'visitas', etiqueta: 'Lo que mueve lo mío', icono: 'fa-solid fa-eye', grupo: 'General' },
  { vista: 'origenes', etiqueta: 'De dónde llegan', icono: 'fa-solid fa-arrow-right-to-bracket', grupo: 'General' },
  { vista: 'enlaces', etiqueta: 'Mis enlaces', icono: 'fa-solid fa-link', grupo: 'General' },
  { vista: 'ventas', etiqueta: 'Mis ventas', icono: 'fa-solid fa-cash-register', grupo: 'Negocio' },
];

@Component({
  selector: 'app-panel-analitica',
  standalone: true,
  imports: [CommonModule, FormsModule, SlicePipe, DashboardGraficoComponent],
  templateUrl: './panel-analitica.component.html',
  styleUrls: ['./panel-analitica.component.scss']
})
export class PanelAnaliticaComponent implements OnInit {

  private analitica = inject(AnaliticaService);
  private empresas = inject(EmpresaService);
  private ruta = inject(ActivatedRoute);
  private router = inject(Router);

  readonly panel = signal<AnaliticaPanel | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly contexto = signal<'personal' | 'empresa'>('personal');
  /** La vista pedida desde el riel: red social, empresa o mi aporte. */
  readonly modo = signal<Modo>('red');
  readonly selectorAbierto = signal(false);
  readonly menuMetricasAbierto = signal(false);
  readonly exportando = signal(false);
  readonly exportado = signal<HojaExportacion | null>(null);

  /** La métrica que se está mirando. */
  readonly vista = signal<Vista>('resumen');

  /**
   * El riel se calcula según el ámbito y el permiso.
   * «Ventas del POS» solo existe en modo empresa y para quien tiene un rol en ella.
   */
  readonly riel = computed<EntradaRiel[]>(() => {
    const permiso = this.puedeVerEmpresa();

    switch (this.modo()) {
      case 'empresa':
        return permiso ? METRICAS_EMPRESA : METRICAS_EMPRESA.filter((e) => e.vista !== 'ventas');
      case 'mi-aporte':
        return permiso ? METRICAS_MI_APORTE : METRICAS_MI_APORTE.filter((e) => e.vista !== 'ventas');
      default:
        return METRICAS_PERSONAL;
    }
  });

  /** Seguimiento de los contactos NFC. */
  readonly seguimiento = signal<FilaSeguimiento[]>([]);
  readonly cargandoSeguimiento = signal(false);
  readonly guardando = signal<string | null>(null);
  readonly estados = ESTADOS_SEGUIMIENTO;
  readonly filtroEstado = signal<EstadoSeguimiento | 'todos'>('todos');

  readonly empresasDisponibles = computed(() => this.empresas.listado());
  readonly empresaActiva = computed(() => this.empresas.empresaActual());
  readonly puedeVerEmpresa = computed(() => {
    const rol = this.empresaActiva()?.rolPropio ?? null;
    return rol === 'ADMIN' || rol === 'EDITOR' || rol === 'LECTOR';
  });

  readonly seguimientoFiltrado = computed(() => {
    const filtro = this.filtroEstado();
    return filtro === 'todos'
      ? this.seguimiento()
      : this.seguimiento().filter((fila) => fila.estado === filtro);
  });

  /** Título y subtítulo según el ámbito y la métrica elegida. */
  readonly titulo = computed(() => {
    const item = this.riel().find((r) => r.vista === this.vista());
    const detalle = item && item.vista !== 'resumen' ? item.etiqueta : null;
    const empresa = this.empresaActiva()?.nombre ?? 'la empresa';

    switch (this.modo()) {
      case 'empresa':
        return detalle ? `${detalle} — ${empresa}` : `Estadísticas de ${empresa}`;
      case 'mi-aporte':
        return detalle ? `${detalle} — mi aporte` : `Mi aporte en ${empresa}`;
      default:
        return detalle ?? 'Mis estadísticas en la red social';
    }
  });

  readonly subtitulo = computed(() => {
    switch (this.modo()) {
      case 'empresa':
        return 'Todo el equipo junto, en el periodo elegido.';
      case 'mi-aporte':
        return 'Solo lo que tú aportas dentro de la empresa.';
      default:
        return 'Tu perfil, tu portafolio y tus enlaces.';
    }
  });

  readonly metricas = computed(() => this.datos().metricas);

  /** Vistas, likes y comentarios de cada proyecto, unidos por nombre. */
  readonly reaccionesPorProyecto = computed(() => {
    const panel = this.panel();
    if (!panel) return [];

    const filas = new Map<string, { proyecto: string; vistas: number; likes: number; comentarios: number }>();

    const sumar = (series: SerieAnalitica[] | undefined, campo: 'vistas' | 'likes' | 'comentarios') => {
      for (const serie of series ?? []) {
        const fila = filas.get(serie.etiqueta) ?? { proyecto: serie.etiqueta, vistas: 0, likes: 0, comentarios: 0 };
        fila[campo] += serie.valor;
        filas.set(serie.etiqueta, fila);
      }
    };

    sumar(panel.vistasPorProyecto, 'vistas');
    sumar(panel.likesPorProyecto, 'likes');
    sumar(panel.comentariosPorProyecto, 'comentarios');

    return [...filas.values()].sort((a, b) => b.vistas - a.vistas);
  });

  readonly datos = computed<DatosDashboard>(() => {
    const panel = this.panel();
    if (!panel) {
      return { contexto: 'personal', titulo: 'Mi panel', subtitulo: 'Cargando…', metricas: [], tarjetas: [] };
    }

    return {
      contexto: panel.contexto,
      titulo: panel.titulo,
      subtitulo: panel.subtitulo,
      metricas: panel.metricas.map((metrica) => ({
        clave: metrica.clave,
        etiqueta: metrica.etiqueta,
        valor: metrica.valor,
        icono: metrica.icono
      })),
      tarjetas: this.tarjetas(panel)
    };
  });

  /** Solo las tarjetas de la vista elegida. */
  readonly tarjetasVisibles = computed<TarjetaDashboard[]>(() => {
    const todas = this.datos().tarjetas;
    const vista = this.vista();

    if (vista === 'resumen') return todas;
    if (vista === 'proyectos-social') return [];

    const mapa: Record<string, string[]> = {
      visitas: ['visitas-dia'],
      origenes: ['origen'],
      enlaces: ['enlaces'],
      ventas: ['ventas-pos'],
      proyectos: this.modo() === 'red'
        ? ['vistas-proyecto', 'likes-proyecto', 'comentarios-proyecto']
        : [],
      seguimiento: ['seguimiento'],
      equipo: ['equipo']
    };

    const ids = mapa[vista] ?? [];
    return todas.filter((tarjeta) => ids.includes(tarjeta.id));
  });

  ngOnInit(): void {
    this.ruta.queryParamMap.subscribe(() => {
      this.aplicarAmbitoDeLaUrl();
      this.cargar();
    });

    this.empresas.cargarMis().subscribe({
      next: () => this.cargar(),
      error: () => this.cargar()
    });
  }

  /** ?modo=red|empresa|mi-aporte viene del riel izquierdo. */
  private aplicarAmbitoDeLaUrl(): void {
    const modo = this.ruta.snapshot.queryParamMap.get('modo') as Modo | null;

    if (modo === 'empresa' || modo === 'mi-aporte') {
      this.modo.set(modo);
      this.contexto.set('empresa');
      this.vista.set('resumen');
      return;
    }

    this.modo.set('red');
    this.contexto.set('personal');
    this.vista.set('resumen');
    this.empresas.salir();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    const empresaId = this.contexto() === 'empresa' ? this.empresaActiva()?.id ?? null : null;

    this.analitica.panel(empresaId, this.desde() || undefined, this.hasta() || undefined).subscribe({
      next: (panel) => {
        this.panel.set(panel);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.error ?? 'No se pudo cargar el panel.');
      }
    });

    this.cargarSeguimiento();
  }

  cargarSeguimiento(): void {
    this.cargandoSeguimiento.set(true);
    this.analitica.seguimiento().subscribe({
      next: (respuesta) => {
        this.seguimiento.set(respuesta.filas ?? []);
        this.cargandoSeguimiento.set(false);
      },
      error: () => {
        this.seguimiento.set([]);
        this.cargandoSeguimiento.set(false);
      }
    });
  }

  cambiarVista(vista: Vista): void {
    this.vista.set(vista);
  }

  alternarMenuMetricas(): void {
    this.menuMetricasAbierto.update((valor) => !valor);
  }

  elegirMetrica(vista: Vista): void {
    this.vista.set(vista);
    this.menuMetricasAbierto.set(false);
  }

  limpiarFechas(): void {
    this.desde.set('');
    this.hasta.set('');
    this.cargar();
  }

  cambiarContexto(contexto: 'personal' | 'empresa'): void {
    // Ventas del POS no existe fuera de una empresa: si estabas ahí, vuelve al resumen.
    if (contexto === 'personal' && this.vista() === 'ventas') {
      this.vista.set('resumen');
    }

    this.contexto.set(contexto);
    this.selectorAbierto.set(false);
    this.vista.set('resumen');

    this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { ambito: contexto === 'empresa' ? 'empresa' : 'personal' },
      queryParamsHandling: 'merge'
    });

    this.cargar();
  }

  alternarSelector(): void {
    this.selectorAbierto.update((valor) => !valor);
  }

  /** Guarda el estado elegido para un contacto. */
  cambiarEstado(fila: FilaSeguimiento, estado: EstadoSeguimiento): void {
    this.guardando.set(fila.contactoId);

    this.analitica.guardarSeguimiento(fila.contactoId, estado, fila.nota, fila.recordarEn).subscribe({
      next: (actualizada) => {
        this.seguimiento.update((lista) =>
          lista.map((item) => (item.contactoId === fila.contactoId ? actualizada : item))
        );
        this.guardando.set(null);
        this.cargar();
      },
      error: () => {
        this.guardando.set(null);
        this.error.set('No se pudo guardar el estado de ese contacto.');
      }
    });
  }

  guardarNota(fila: FilaSeguimiento, nota: string): void {
    this.guardando.set(fila.contactoId);

    this.analitica.guardarSeguimiento(fila.contactoId, fila.estado, nota, fila.recordarEn).subscribe({
      next: (actualizada) => {
        this.seguimiento.update((lista) =>
          lista.map((item) => (item.contactoId === fila.contactoId ? actualizada : item))
        );
        this.guardando.set(null);
      },
      error: () => {
        this.guardando.set(null);
        this.error.set('No se pudo guardar la nota.');
      }
    });
  }

  guardarRecordatorio(fila: FilaSeguimiento, fecha: string): void {
    this.guardando.set(fila.contactoId);

    this.analitica.guardarSeguimiento(fila.contactoId, fila.estado, fila.nota, fecha || null).subscribe({
      next: (actualizada) => {
        this.seguimiento.update((lista) =>
          lista.map((item) => (item.contactoId === fila.contactoId ? actualizada : item))
        );
        this.guardando.set(null);
      },
      error: () => {
        this.guardando.set(null);
        this.error.set('No se pudo guardar el recordatorio.');
      }
    });
  }

  etiquetaEstado(estado: string): string {
    return this.estados.find((e) => e.valor === estado)?.etiqueta ?? estado;
  }

  iconoEstado(estado: string): string {
    return this.estados.find((e) => e.valor === estado)?.icono ?? 'fa-solid fa-circle';
  }

  iniciales(nombre: string | null): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  exportar(): void {
    const empresaId = this.contexto() === 'empresa' ? this.empresaActiva()?.id ?? null : null;
    this.exportando.set(true);

    this.analitica.exportarContactos(empresaId, this.desde() || undefined, this.hasta() || undefined).subscribe({
      next: (hoja) => {
        this.exportado.set(hoja);
        this.exportando.set(false);
      },
      error: () => {
        this.exportando.set(false);
        this.error.set('No se pudo preparar la exportación.');
      }
    });
  }

  descargarCsv(): void {
    const hoja = this.exportado();
    if (!hoja) return;

    const filas = [hoja.encabezados, ...hoja.filas].map((fila) =>
      fila.map((celda) => `"${String(celda ?? '').replace(/"/g, '""')}"`).join(',')
    );

    const blob = new Blob([filas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${hoja.titulo.toLowerCase().replace(/\s+/g, '-')}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private tarjetas(panel: AnaliticaPanel): TarjetaDashboard[] {
    const tarjetas: TarjetaDashboard[] = [
      this.tarjeta('visitas-dia', 'Visitas por día', 'Periodo seleccionado', 'area', panel.visitasPorDia),
      this.tarjeta('origen', 'De dónde llegan', 'Canal de entrada', 'torta', panel.origenes),
      this.tarjeta('enlaces', 'Clics en enlaces', 'Enlaces más abiertos', 'barras', panel.clicsEnlaces),
      // Ventas solo en los modos de empresa, y solo con permiso.
      ...(this.modo() !== 'red' && this.puedeVerEmpresa()
        ? [this.tarjeta('ventas-pos', 'Ventas del POS', 'Tickets por día de venta', 'columnas', panel.ventasPos ?? [])]
        : []),
      this.tarjeta('seguimiento', 'Contactos NFC por estado', 'Seguir, llamar después, reunión…',
        'torta', panel.seguimientoNfc ?? []),
      this.tarjeta('vistas-proyecto', 'Vistas por proyecto', 'La página y cada proyecto',
        'barras', panel.vistasPorProyecto ?? []),
      this.tarjeta('likes-proyecto', 'Likes por proyecto', 'Reacciones en cada tarjeta',
        'barras', panel.likesPorProyecto ?? []),
      this.tarjeta('comentarios-proyecto', 'Comentarios por proyecto', 'Conversación en cada tarjeta',
        'barras', panel.comentariosPorProyecto ?? [])
    ];

    if (panel.contexto === 'empresa' && panel.rendimientoEmpleados.length > 0) {
      tarjetas.push(this.tarjeta('equipo', 'Rendimiento del equipo', 'Eventos por empleado', 'barras', panel.rendimientoEmpleados));
    }

    return tarjetas.filter((tarjeta) => tarjeta.series.length > 0);
  }

  private tarjeta(id: string, titulo: string, descripcion: string, tipo: TipoGrafico,
                  series: SerieAnalitica[]): TarjetaDashboard {

    return {
      id,
      titulo,
      descripcion,
      tipoGrafico: tipo,
      permitidos: TODOS,
      series: series.map((serie): SerieDashboard => ({ etiqueta: serie.etiqueta, valor: serie.valor }))
    };
  }
}

import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MapaRealComponent } from '../../shared/components/mapa-real/mapa-real.component';
import { MapillaryComponent } from '../../shared/components/mapillary/mapillary.component';
import { EmpleoMapaComponent, VacanteUbicada } from './empleo-mapa/empleo-mapa.component';

import { AuthService } from '../../core/services/auth.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { MapaService, UbicacionMapa, VisibilidadUbicacion } from '../../core/services/mapa.service';
import { ToastService } from '../../core/services/toast.service';
import { AnaliticaService } from '../../core/services/analitica.service';
import {
  LocalRegistrado,
  SECTORES,
  TipoConexion,
  ToqueUbicacion,
} from './ubicacion.model';

type Medio = 'TODOS' | 'NFC' | 'QR';

@Component({
  selector: 'app-ubicacion',
  standalone: true,
  imports: [CommonModule, FormsModule, MapaRealComponent, MapillaryComponent, EmpleoMapaComponent],
  templateUrl: './ubicacion.component.html',
  styleUrls: ['./ubicacion.component.scss'],
})
export class UbicacionComponent implements OnInit, AfterViewInit {
  @ViewChild(MapaRealComponent) mapa?: MapaRealComponent;

  private auth = inject(AuthService);
  private empresas = inject(EmpresaService);
  private mapaSvc = inject(MapaService);
  private toasts = inject(ToastService);
  private analitica = inject(AnaliticaService);

  readonly VISIBILIDADES: { valor: VisibilidadUbicacion; etiqueta: string; detalle: string; icono: string }[] = [
    { valor: 'PRIVATE', etiqueta: 'Privada', detalle: 'Solo tú ves tu mapa', icono: 'fa-lock' },
    { valor: 'FRIENDS', etiqueta: 'Solo amigos', detalle: 'Compartes con tus conexiones', icono: 'fa-user-group' },
    { valor: 'PUBLIC', etiqueta: 'Público', detalle: 'Apareces en el mapa de todos', icono: 'fa-globe' }
  ];

  readonly visibilidad = signal<VisibilidadUbicacion>('PRIVATE');
  readonly panelPrivacidad = signal(false);
  readonly guardandoUbicacion = signal(false);
  readonly ubicaciones = this.mapaSvc.ubicaciones;
  readonly miUbicacion = this.mapaSvc.miUbicacion;
  readonly pantallaCompleta = signal(false);
  readonly metricasAbiertas = signal(typeof window !== 'undefined' ? window.innerWidth > 900 : true);

  readonly nombrePersona = signal(this.auth.currentUser()?.fullName ?? 'Tu perfil');
  readonly empresaActiva = this.empresas.empresaActual;

  /**
   * Los toques salen de tu analítica real. Mientras llegan (o si no hay),
   * la vista lo dice en vez de enseñar cifras inventadas.
   */
  readonly toques = signal<ToqueUbicacion[]>([]);
  readonly cargandoToques = signal(true);
  readonly sinDatos = computed(() => !this.cargandoToques() && this.toques().length === 0);

  /** El aviso se ve si no hay datos y no lo cerraste en esta visita al mapa. */
  readonly avisoCerrado = signal(false);
  readonly avisoEnEspera = computed(() => this.sinDatos() && !this.avisoCerrado());
  readonly filtroNombre = signal('');
  readonly filtroDesde = signal('');
  readonly filtroHasta = signal('');
  readonly filtroMedio = signal<Medio>('TODOS');
  readonly filtroTipo = signal<'TODOS' | TipoConexion>('TODOS');
  readonly capas = signal({ personal: true, empresarial: true, locales: true, amigos: true });
  readonly punto = signal({ lat: 4.6097, lng: -74.0817, zoom: 12, nombre: 'Bogotá' });
  readonly abierto = signal({ locales: true, historial: false, ciudades: true });

  /** La columna entera de paneles (locales, historial, empleo) se abre y se cierra. */
  readonly columnaAbierta = signal(typeof window !== 'undefined' ? window.innerWidth > 900 : true);
  readonly seleccionado = signal<ToqueUbicacion | null>(null);
  readonly localActivo = signal<LocalRegistrado | null>(null);
  readonly locales = signal<LocalRegistrado[]>([]);
  readonly sectores = SECTORES;
  readonly busquedaLocal = signal('');
  readonly filtroSector = signal<'' | import('./ubicacion.model').SectorEmpresa>('');

  readonly ciudades = computed<{ ciudad: string; total: number }[]>(() =>
    [...this.visibles().reduce((mapa, toque) => {
      mapa.set(toque.ciudad, (mapa.get(toque.ciudad) ?? 0) + toque.toques);
      return mapa;
    }, new Map<string, number>())]
      .map(([ciudad, total]) => ({ ciudad, total }))
      .sort((a, b) => b.total - a.total)
  );

  readonly localesVisibles = computed(() =>
    this.locales().filter((local) => {
      if (!this.capas().locales) return false;
      const texto = this.busquedaLocal().trim().toLowerCase();
      const nombre = texto
        ? `${local.nombre} ${local.servicio} ${local.sector} ${local.ciudad} ${local.lugar}`
            .toLowerCase()
            .includes(texto)
        : true;

      const sector = this.filtroSector() ? local.sector === this.filtroSector() : true;

      return nombre && sector;
    }),
  );

  get totalLocales(): number {
    return this.localesVisibles().length;
  }

  readonly visibles = computed(() =>
    this.toques().filter((toque) => {
      const texto = this.filtroNombre().trim().toLowerCase();
      const nombre = texto
        ? `${toque.persona} ${toque.empresa} ${toque.ciudad} ${toque.lugar}`.toLowerCase().includes(texto)
        : true;

      const desde = this.filtroDesde() ? toque.fecha >= this.filtroDesde() : true;
      const hasta = this.filtroHasta() ? toque.fecha <= this.filtroHasta() : true;
      const medio = this.filtroMedio() === 'TODOS' ? true : toque.medio === this.filtroMedio();
      const tipo = this.filtroTipo() === 'TODOS' ? true : toque.tipo === this.filtroTipo();
      const capa =
        toque.tipo === 'PERSONAL' ? this.capas().personal : this.capas().empresarial;

      return nombre && desde && hasta && medio && tipo && capa;
    }),
  );

  readonly totalToques = computed(() => this.visibles().reduce((suma, toque) => suma + toque.toques, 0));
  readonly totalPersonas = computed(() => this.visibles().length);
  readonly ciudadesDistintas = computed(
    () => new Set(this.visibles().map((toque) => toque.ciudad)).size,
  );

  readonly conexionesPersonales = computed(() => this.toques().filter((toque) => toque.tipo === 'PERSONAL').length);
  readonly conexionesEmpresariales = computed(
    () => this.toques().filter((toque) => toque.tipo === 'EMPRESARIAL').length,
  );

  cerrarAviso(): void {
    this.avisoCerrado.set(true);
  }

  /** La barra se mide contra la ciudad con más toques, no contra un número fijo. */
  porcentajeCiudad(total: number): number {
    const maximo = this.ciudades()[0]?.total ?? 0;
    return maximo ? Math.round((total / maximo) * 100) : 0;
  }

  limpiar(): void {
    this.avisoCerrado.set(false);
    this.filtroNombre.set('');
    this.filtroDesde.set('');
    this.filtroHasta.set('');
    this.filtroMedio.set('TODOS');
    this.filtroTipo.set('TODOS');
    this.busquedaLocal.set('');
    this.filtroSector.set('');
    this.capas.set({ personal: true, empresarial: true, locales: true, amigos: true });
  }

  alternarColumna(): void {
    this.columnaAbierta.update((abierta) => !abierta);
  }

  alternar(panel: 'locales' | 'historial' | 'ciudades'): void {
    this.abierto.update((actual) => ({ ...actual, [panel]: !actual[panel] }));
  }

  alternarCapa(capa: 'personal' | 'empresarial' | 'locales' | 'amigos'): void {
    this.capas.update((actual) => ({ ...actual, [capa]: !actual[capa] }));
    this.pintarPines();
  }

  /** Abre el historial (la guía lo muestra cerrado) y lo deja listo para leer. */
  abrirHistorial(): void {
    this.abierto.update((actual) => ({ ...actual, historial: true }));
  }

  seleccionar(toque: ToqueUbicacion): void {
    this.localActivo.set(null);
    const mismo = this.seleccionado()?.id === toque.id;
    this.seleccionado.set(mismo ? null : toque);

    if (!mismo) {
      this.punto.set({ lat: toque.latitud, lng: toque.longitud, zoom: 16, nombre: toque.ciudad });
      this.mapa?.limpiarMarcadores();
      this.mapa?.irA(toque.latitud, toque.longitud, 16);
      this.mapa?.marcar(
        toque.latitud,
        toque.longitud,
        `<b>${toque.persona}</b><br>${toque.ciudad} · ${toque.toques} toques`,
        toque.tipo === 'PERSONAL' ? 'personal' : 'empresarial',
      );
    } else {
      this.pintarPines();
    }
  }

  seleccionarLocal(local: LocalRegistrado): void {
    this.seleccionado.set(null);
    const mismo = this.localActivo()?.id === local.id;
    this.localActivo.set(mismo ? null : local);

    if (!mismo) {
      this.verLocalEnMapa(local);
    }
  }

  /** Lleva el mapa al local y lo deja marcado, sin cerrar la ficha. */
  verLocalEnMapa(local: LocalRegistrado, evento?: Event): void {
    evento?.stopPropagation();

    this.seleccionado.set(null);
    this.localActivo.set(local);
    this.punto.set({ lat: local.latitud, lng: local.longitud, zoom: 17, nombre: local.nombre });

    this.mapa?.limpiarMarcadores();
    this.mapa?.irA(local.latitud, local.longitud, 17);
    this.mapa?.marcar(
      local.latitud,
      local.longitud,
      `<b>${local.nombre}</b><br>${local.servicio} · ${local.ciudad}`,
      'local',
    );
  }

  verPunto(lat: number, lng: number, nombre: string, zoom = 16): void {
    this.punto.set({ lat, lng, zoom, nombre });
    this.mapa?.irA(lat, lng, zoom);
    this.pintarPines();
    this.mapa?.marcar(lat, lng, `<b>${nombre}</b>`, 'local');
  }

  ubicarVacante(item: VacanteUbicada): void {
    const vacante = item.vacante;
    const puntaje = vacante.puntaje ?? 0;
    const coincidencias = (vacante.coincidencias ?? []).slice(0, 3).join(', ');
    const empresa = vacante.empresa ?? 'Empresa';

    const exacta = item.fuente === 'nominatim';
    const donde = exacta
      ? (item.direccion ? item.direccion.split(',').slice(0, 3).join(',') : item.ciudad)
      : `Cerca de ${item.ciudad} (aproximada)`;

    const texto = [
      `<b>${vacante.cargo ?? 'Vacante'}</b>`,
      `${empresa}`,
      `<span style="color:#fcd34d;font-weight:800">${puntaje}% de cercanía</span>`,
      `<i style="opacity:.8">${donde}</i>`,
      vacante.modalidad ? `${vacante.modalidad}` : '',
      coincidencias ? `Ya cumples: ${coincidencias}` : '',
      vacante.portal ? `<span style="opacity:.6">Fuente: ${vacante.portal}</span>` : '',
    ]
      .filter(Boolean)
      .join('<br>');

    this.punto.set({ lat: item.lat, lng: item.lng, zoom: 15, nombre: `${empresa} · ${item.ciudad}` });
    this.mapa?.limpiarMarcadores();
    this.mapa?.irA(item.lat, item.lng, 15);
    this.mapa?.marcar(item.lat, item.lng, texto, 'empleo');
  }

  ubicarVacantes(items: VacanteUbicada[]): void {
    if (!items.length || !this.mapa) return;

    this.mapa.marcarVarios(
      items.map((item) => ({
        lat: item.lat,
        lng: item.lng,
        tono: 'empleo' as const,
        texto: [
          `<b>${item.vacante.cargo ?? 'Vacante'}</b>`,
          item.vacante.empresa ?? '',
          `<span style="color:#fcd34d;font-weight:800">${item.vacante.puntaje}%</span> · ${item.ciudad}`,
        ]
          .filter(Boolean)
          .join('<br>'),
      })),
    );

    this.mapa.ajustar(items.map((item) => ({ lat: item.lat, lng: item.lng })));
    this.punto.set({
      lat: items[0].lat,
      lng: items[0].lng,
      zoom: 12,
      nombre: `${items.length} empresas`,
    });
  }

  ngOnInit(): void {
    this.cargarUbicacion();
    this.cargarToques();
  }

  /**
   * Trae de la analítica lo que este mapa necesita. Si el backend no tiene
   * puntos con ciudad, la vista se queda «en espera» en vez de mostrar maqueta.
   */
  cargarToques(): void {
    this.cargandoToques.set(true);
    // Cada vez que se carga el mapa, el aviso vuelve a estar disponible.
    this.avisoCerrado.set(false);

    this.analitica.panel(null).subscribe({
      next: (panel) => {
        const origenes = panel.origenes ?? [];

        this.toques.set(
          origenes
            .filter((origen) => origen.valor > 0)
            .map((origen, indice): ToqueUbicacion => ({
              id: String(indice),
              persona: origen.etiqueta,
              empresa: '',
              iniciales: (origen.etiqueta ?? '?').slice(0, 2).toUpperCase(),
              ciudad: '',
              lugar: origen.etiqueta,
              latitud: 0,
              longitud: 0,
              fecha: panel.desde ?? '',
              medio: 'NFC',
              tipo: 'PERSONAL',
              toques: origen.valor,
            }))
        );

        this.cargandoToques.set(false);
      },
      error: () => {
        this.toques.set([]);
        this.cargandoToques.set(false);
      }
    });
  }

  cargarUbicacion(): void {
    this.mapaSvc.cargarMiUbicacion().subscribe({
      next: (ubicacion) => {
        this.visibilidad.set(ubicacion?.visibilidad ?? 'PRIVATE');
        if (ubicacion) this.centrarEnMi();
      }
    });

    this.mapaSvc.cargarUbicaciones().subscribe({
      next: () => this.pintarPines()
    });
  }

  etiquetaVisibilidad(): string {
    return this.VISIBILIDADES.find((opcion) => opcion.valor === this.visibilidad())?.etiqueta ?? 'Privada';
  }

  alternarPrivacidad(): void {
    this.panelPrivacidad.update((abierto) => !abierto);
  }

  cambiarVisibilidad(valor: VisibilidadUbicacion): void {
    if (this.guardandoUbicacion() || valor === this.visibilidad()) return;

    if (valor === 'PRIVATE') {
      this.ocultarUbicacion();
      return;
    }

    this.guardandoUbicacion.set(true);

    this.obtenerCoordenadas().then((coordenadas) => {
      this.mapaSvc.publicarUbicacion({
        visibilidad: valor,
        lat: coordenadas.lat,
        lng: coordenadas.lng,
        ciudad: coordenadas.ciudad,
        origen: 'N-SOFT'
      }).subscribe({
        next: (ubicacion) => {
          this.guardandoUbicacion.set(false);
          this.visibilidad.set(ubicacion.visibilidad);
          this.panelPrivacidad.set(false);
          this.pintarPines();
          this.centrarEnMi();
          this.toasts.show(valor === 'PUBLIC' ? 'Tu ubicación es pública.' : 'Compartes tu ubicación con tus amigos.');
        },
        error: () => {
          this.guardandoUbicacion.set(false);
          this.toasts.show('No se pudo guardar tu ubicación.');
        }
      });
    }).catch(() => {
      this.guardandoUbicacion.set(false);
      this.toasts.show('Necesitamos tu permiso de ubicación para compartirla.');
    });
  }

  ocultarUbicacion(): void {
    this.guardandoUbicacion.set(true);

    this.mapaSvc.ocultarUbicacion().subscribe({
      next: () => {
        this.guardandoUbicacion.set(false);
        this.visibilidad.set('PRIVATE');
        this.panelPrivacidad.set(false);
        this.pintarPines();
        this.toasts.show('Tu ubicación volvió a ser privada.');
      },
      error: () => {
        this.guardandoUbicacion.set(false);
        this.toasts.show('No se pudo ocultar tu ubicación.');
      }
    });
  }

  centrarEnMi(): void {
    const propia = this.miUbicacion();

    if (!propia || propia.lat == null) return;

    this.punto.set({ lat: propia.lat, lng: propia.lng, zoom: 14, nombre: propia.ciudad ?? 'Tu ubicación' });
    this.mapa?.irA(propia.lat, propia.lng, 14);
  }

  alternarMetricas(): void {
    this.metricasAbiertas.update((abierta) => !abierta);
  }

  alternarPantallaCompleta(): void {
    this.pantallaCompleta.update((completa) => !completa);

    setTimeout(() => this.mapa?.ajustarVista(), 260);
  }

  private obtenerCoordenadas(): Promise<{ lat: number; lng: number; ciudad: string | null }> {
    return new Promise((resolver, rechazar) => {
      if (!('geolocation' in navigator)) {
        rechazar(new Error('sin geolocalización'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (posicion) => resolver({
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
          ciudad: this.miUbicacion()?.ciudad ?? null
        }),
        () => rechazar(new Error('permiso denegado')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.pintarPines(), 700);
  }

  /**
   * Pinta todos los pines del mapa con su color de capa. Va por marcarVarios:
   * marcar() reutiliza un único marcador y solo dejaba el último punto.
   */
  private pintarPines(): void {
    if (!this.mapa) return;

    const capas = this.capas();
    const puntos = [
      ...this.visibles().map((toque) => ({
        lat: toque.latitud,
        lng: toque.longitud,
        tono: (toque.tipo === 'PERSONAL' ? 'personal' : 'empresarial') as 'personal' | 'empresarial',
        texto: [`<b>${toque.persona}</b>`, `${toque.ciudad} · ${toque.toques} toques`, toque.lugar]
          .filter(Boolean)
          .join('<br>'),
      })),
      ...(capas.amigos
        ? this.ubicaciones()
            .filter((ubicacion) => !ubicacion.propio && ubicacion.lat != null)
            .map((ubicacion: UbicacionMapa) => ({
              lat: ubicacion.lat,
              lng: ubicacion.lng,
              tono: 'amigo' as const,
              texto: [
                `<b>${ubicacion.nombre}</b>`,
                ubicacion.ciudad ?? '',
                ubicacion.visibilidad === 'FRIENDS' ? 'Solo amigos' : 'Público'
              ].filter(Boolean).join('<br>')
            }))
        : []),
      ...(capas.locales
        ? this.localesVisibles().map((local) => ({
            lat: local.latitud,
            lng: local.longitud,
            tono: 'local' as const,
            texto: `<b>${local.nombre}</b><br>${local.servicio} · ${local.ciudad}`,
          }))
        : []),
    ];

    this.mapa.marcarVarios(puntos);
  }

  posicionX(longitud: number): number {
    const minimo = -77.8;
    const maximo = -71.8;
    const t = (longitud - minimo) / (maximo - minimo);
    return Math.min(72, Math.max(28, 28 + t * 42));
  }

  posicionY(latitud: number): number {
    const minimo = -1.5;
    const maximo = 11.5;
    const t = (maximo - latitud) / (maximo - minimo);
    return Math.min(88, Math.max(10, 10 + t * 78));
  }

  burbuja(toques: number): number {
    return Math.min(46, 16 + toques * 2);
  }

  iniciales(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  fecha(valor: string): string {
    if (!valor) return '';
    const [anio, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${anio}`;
  }
}

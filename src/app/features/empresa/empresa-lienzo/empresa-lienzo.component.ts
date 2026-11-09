import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, tap } from 'rxjs/operators';

import {
  ComponenteLienzo,
  DisenoLienzo,
  ContenidoGaleria,
  ContenidoMenu,
  DisenoEmpresa,
  Empresa,
  MenuGrupo,
  PanelEmpresa,
  TipoComponente,
} from '../../../core/models/empresa.model';
import { EmpresaService, mensajeDeError } from '../../../core/services/empresa.service';
import { DisenoService } from '../../../core/services/diseno.service';
import {
  FUENTES,
  LIENZO_ALTO,
  LIENZO_ANCHO,
  PALETA_MARCA,
  PLANTILLA_HTML,
  PLANTILLA_HTML_ESTATICA,
  contenidoInicial,
  estiloInicial,
  iconoComponente,
  leerImagen,
  leerJson,
  tamanoInicial,
} from '../empresa-ui';
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';

interface ComponenteEditor extends ComponenteLienzo {
  clave: string;
}

interface Arrastre {
  clave: string;
  modo: 'mover' | 'redimensionar';
  direccion: string;
  inicioX: number;
  inicioY: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

function marcoAlto(marco?: ElementRef<HTMLElement>): number {
  return marco?.nativeElement?.clientHeight ?? 0;
}

type PanelLateral = 'componentes' | 'imagenes' | 'fuentes' | 'marca' | 'capas';

@Component({
  selector: 'app-empresa-lienzo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EmpresaComponenteVistaComponent],
  templateUrl: './empresa-lienzo.component.html',
  styleUrls: ['./empresa-lienzo.component.scss'],
})
export class EmpresaLienzoComponent implements OnInit, AfterViewInit, OnDestroy {
  private empresaSvc = inject(EmpresaService);
  private disenoSvc = inject(DisenoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('marco') marco?: ElementRef<HTMLElement>;

  readonly panel = this.empresaSvc.panel;
  readonly ancho = LIENZO_ANCHO;
  readonly alto = LIENZO_ALTO;
  readonly fuentes = FUENTES;
  readonly paleta = PALETA_MARCA;
  readonly maxHtml = 380_000;

  readonly componentes = signal<ComponenteEditor[]>([]);
  readonly seleccionClave = signal<string | null>(null);
  readonly panelLateral = signal<PanelLateral>('componentes');
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly escalaBase = signal(0.6);
  readonly zoom = signal(1);
  readonly ajustarCuadricula = signal(true);
  readonly mostrarCuadricula = signal(true);
  /** Cuántos cambios hay sin guardar: se usa para avisar antes de salir y para el autoguardado. */
  readonly pendientes = signal(0);
  /** Diseño en el que se está trabajando (null = lienzo general de la empresa). */
  readonly disenoActivo = signal<DisenoLienzo | null>(null);
  /** Paneles laterales plegados para ver el lienzo completo. */
  readonly lateralPlegado = signal(false);
  readonly inspectorPlegado = signal(false);
  /** La ventana de propiedades se mueve, se achica y se agranda como cualquier ventana. */
  readonly inspectorPos = signal({ x: 28, y: 28 });
  readonly inspectorTam = signal({ ancho: 340, alto: 460 });
  readonly inspectorMinimizado = signal(false);
  readonly inspectorMaximizado = signal(false);
  /** La guía de atajos arranca plegada para no tapar el lienzo. */
  readonly ayudaAbierta = signal(false);
  /** Ver el HTML de la pieza en grande, sin iframe de por medio. */
  readonly mostrarCodigoHtml = signal(false);
  /** Alto del lienzo en píxeles reales: se alarga hacia abajo y se guarda con el diseño. */
  readonly altoVista = signal(LIENZO_ALTO);
  /** Último alto guardado del lienzo general (evita guardar dos veces lo mismo). */
  private altoExtraGuardado = 0;

  readonly escala = computed(() => Math.min(1.6, Math.max(0.16, this.escalaBase() * this.zoom())));

  borradorContenido: any = {};
  borradorEstilo: any = {};

  fuenteNueva = FUENTES[0].valor;
  disenoAcento = '#2563eb';
  disenoSecundario = '#0ea5e9';
  disenoFondo = '';
  disenoCss = '';
  erroresDiseno: string[] = [];
  guardandoMarca = false;
  creandoDiseno = false;
  private disenoGuardado: DisenoEmpresa | null = null;

  private arrastre: Arrastre | null = null;
  private modificados = new Set<string>();
  private eliminados = new Set<string>();
  private historial: string[] = [];
  private posicionHistorial = -1;
  private contadorTemporal = 0;
  private ajustar = (): void => this.calcularEscala();
  private temporizadorAutoguardado: any = null;
  private temporizadorHtml: any = null;
  private htmlPendiente: string | null = null;
  private saliendo = (evento: BeforeUnloadEvent): void => {
    if (this.pendientes() > 0) evento.preventDefault();
  };
  private tecla = (evento: KeyboardEvent): void => this.alTeclado(evento);

  private readonly moverListener = (evento: PointerEvent): void => this.mover(evento);
  private readonly soltarListener = (): void => this.soltar();

  ngOnInit(): void {
    this.disenoAcento = '#2563eb';

    this.empresaSvc.cargarCatalogo().subscribe();
    this.empresaSvc.cargarMis().subscribe((mias) => {
      if (!mias.length) {
        this.cargando.set(false);
        return;
      }

      const activa = this.empresaSvc.activaId() ?? mias[0].id;
      if (!this.empresaSvc.activaId()) this.empresaSvc.entrar(activa);
      this.cargar(activa);
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.calcularEscala();
    window.addEventListener('resize', this.ajustar);
    window.addEventListener('keydown', this.tecla);
    window.addEventListener('beforeunload', this.saliendo);
    setTimeout(() => this.calcularEscala(), 60);
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.ajustar);
      window.removeEventListener('keydown', this.tecla);
      window.removeEventListener('beforeunload', this.saliendo);
      clearTimeout(this.temporizadorAutoguardado);
      clearTimeout(this.temporizadorHtml);

      if (this.htmlPendiente !== null) {
        const pendiente = this.htmlPendiente;
        this.htmlPendiente = null;
        this.asignar('html', pendiente);
      }
      window.removeEventListener('pointermove', this.moverListener);
      window.removeEventListener('pointerup', this.soltarListener);
    }
    this.disenoSvc.limpiarAjeno();
  }

  get actual(): Empresa | null {
    return this.panel()?.empresa ?? this.empresaSvc.empresaActual();
  }

  get acceso() {
    return this.panel()?.acceso ?? null;
  }

  get puedeEditar(): boolean {
    return Boolean(this.acceso?.editaLienzo);
  }

  get puedeCrear(): boolean {
    return Boolean(this.acceso?.creaComponentes);
  }

  get puedePublicar(): boolean {
    return Boolean(this.acceso?.publica);
  }

  /** Cualquiera que pueda crear piezas puede dejar su lienzo compartible. */
  get puedePublicarLienzo(): boolean {
    return this.puedeCrear || this.puedeEditar;
  }

  get mensajeBloqueo(): string {
    return this.puedeCrear
      ? 'Solo puedes editar los componentes que tú creaste.'
      : 'Tu rol solo permite consultar el lienzo.';
  }

  puedeTocar(componente: ComponenteLienzo | null | undefined): boolean {
    if (!componente) return false;
    if (this.puedeEditar) return true;
    if (!this.puedeCrear) return false;
    return !componente.id || componente.propio === true;
  }

  get catalogo(): { tipo: TipoComponente; etiqueta: string }[] {
    const lista = this.panel()?.catalogo ?? [];
    if (lista.length) {
      return lista.map((item) => ({ tipo: item.tipo, etiqueta: item.etiqueta }));
    }
    return (['TEXTO', 'IMAGEN', 'BOTON', 'LISTA', 'MENU', 'PRODUCTO', 'GALERIA', 'CONTACTO', 'HORARIO', 'SEPARADOR'] as TipoComponente[]).map(
      (tipo) => ({ tipo, etiqueta: tipo }),
    );
  }

  get seleccionado(): ComponenteEditor | null {
    const clave = this.seleccionClave();
    if (!clave) return null;
    return this.componentes().find((item) => item.clave === clave) ?? null;
  }

  get capasOrdenadas(): ComponenteEditor[] {
    return [...this.componentes()].sort((a, b) => {
      if (a.detras !== b.detras) return a.detras ? -1 : 1;
      return b.capa - a.capa;
    });
  }

  get imagenesLienzo(): string[] {
    const urls: string[] = [];
    for (const componente of this.componentes()) {
      const datos = leerJson<any>(componente.contenido, {});
      if (componente.tipo === 'IMAGEN' && datos.url) urls.push(datos.url);
      if (componente.tipo === 'PRODUCTO' && datos.imagen) urls.push(datos.imagen);
      if (componente.tipo === 'GALERIA' && Array.isArray(datos.imagenes)) urls.push(...datos.imagenes);
    }
    return Array.from(new Set(urls.filter((url) => Boolean(url))));
  }

  get puedeDeshacer(): boolean {
    return this.posicionHistorial > 0;
  }

  get puedeRehacer(): boolean {
    return this.posicionHistorial >= 0 && this.posicionHistorial < this.historial.length - 1;
  }

  get urlPublica(): string {
    const slug = this.actual?.slug;
    return slug ? `/empresa/${slug}` : '/empresa';
  }

  /** Misma página pública, abierta con sesión: sirve de vista previa antes de publicar. */
  get urlVistaPrevia(): string {
    const slug = this.disenoActivo()?.slug;
    return slug ? `/diseno/${slug}` : this.urlPublica;
  }

  /** Carpeta de componentes: menús, tarjetas y piezas con enlace propio. */
  get urlCarpeta(): string {
    return '/app/empresa/disenos';
  }

  /** Enlace público de una pieza concreta del lienzo. */
  enlaceDe(componente: ComponenteEditor): string {
    if (componente.enlace) return componente.enlace;
    const slug = this.actual?.slug;
    if (slug && componente.id) return `/empresa/${slug}/c/${componente.id}`;
    return this.urlCarpeta;
  }

  /** Solo tiene enlace propio lo que está guardado y visible. */
  puedeCompartir(componente: ComponenteEditor | null | undefined): boolean {
    return Boolean(componente?.id && componente.visible);
  }

  copiarEnlaceComponente(componente: ComponenteEditor): void {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
      this.error.set('Tu navegador no deja copiar el enlace. Cópialo desde la barra de direcciones.');
      return;
    }

    const url = `${window.location.origin}${this.enlaceDe(componente)}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => this.aviso.set('Enlace del componente copiado.'))
      .catch(() => this.error.set('No se pudo copiar el enlace.'));
  }

  get textoLista(): string {
    return Array.isArray(this.borradorContenido?.items) ? this.borradorContenido.items.join('\n') : '';
  }

  get menu(): ContenidoMenu {
    return this.borradorContenido as ContenidoMenu;
  }

  get galeria(): ContenidoGaleria {
    return this.borradorContenido as ContenidoGaleria;
  }

  cambiarPanel(panel: PanelLateral): void {
    this.panelLateral.set(panel);
    if (this.lateralPlegado()) this.lateralPlegado.set(false);
  }

  /**
   * En el lienzo NO se crean diseños: se edita el diseño abierto (o el lienzo general).
   * Si no hay diseño en la URL, se sigue trabajando sobre el lienzo general de la empresa.
   */
  nuevoDiseno(): void {
    const empresa = this.actual;
    if (!empresa) return;

    if (this.disenoActivo()) {
      this.recargar();
      this.aviso.set(`Editando «${this.disenoActivo()?.nombre}».`);
      return;
    }

    this.recargar();
    this.aviso.set('Editando el lienzo general de la empresa.');
  }

  alternarLateral(): void {
    this.lateralPlegado.update((valor) => !valor);
    setTimeout(() => this.calcularEscala(), 80);
  }

  alternarInspector(): void {
    this.inspectorPlegado.update((valor) => !valor);
    setTimeout(() => this.calcularEscala(), 80);
  }

  /** Vista limpia: esconde los dos paneles para trabajar solo con la hoja. */
  /** Rueda del ratón sobre el lienzo: Ctrl o Shift hace zoom, normal desplaza. */
  alRodar(evento: WheelEvent): void {
    if (!(evento.ctrlKey || evento.metaKey || evento.shiftKey)) return;

    evento.preventDefault();

    if (evento.deltaY < 0) this.acercar();
    else this.alejar();
  }

  /** Arrastra la ventana de propiedades desde su cabecera. */
  moverInspector(evento: PointerEvent): void {
    if (typeof window === 'undefined') return;
    if (this.inspectorMaximizado()) return;

    const objetivo = evento.target as HTMLElement | null;
    if (objetivo?.closest('button, input, a, textarea, select')) return;

    evento.preventDefault();

    const inicioX = evento.clientX;
    const inicioY = evento.clientY;
    const base = this.inspectorPos();

    const mover = (movimiento: PointerEvent): void => {
      const x = Math.max(0, Math.min(2400, base.x + movimiento.clientX - inicioX));
      const y = Math.max(0, Math.min(2400, base.y + movimiento.clientY - inicioY));
      this.inspectorPos.set({ x: Math.round(x), y: Math.round(y) });
    };

    const soltar = (): void => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    };

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  /** Redimensiona la ventana desde su esquina inferior derecha. */
  redimensionarInspector(evento: PointerEvent): void {
    if (typeof window === 'undefined' || this.inspectorMaximizado()) return;

    evento.preventDefault();
    evento.stopPropagation();

    const inicioX = evento.clientX;
    const inicioY = evento.clientY;
    const base = this.inspectorTam();

    const mover = (movimiento: PointerEvent): void => {
      const ancho = Math.max(240, Math.min(720, base.ancho + movimiento.clientX - inicioX));
      const alto = Math.max(180, Math.min(1200, base.alto + movimiento.clientY - inicioY));
      this.inspectorTam.set({ ancho: Math.round(ancho), alto: Math.round(alto) });
    };

    const soltar = (): void => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    };

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  minimizarInspector(): void {
    this.inspectorMinimizado.update((valor) => !valor);
    if (this.inspectorMaximizado()) this.inspectorMaximizado.set(false);
  }

  maximizarInspector(): void {
    this.inspectorMaximizado.update((valor) => !valor);
    if (this.inspectorMaximizado()) this.inspectorMinimizado.set(false);
  }

  cerrarInspector(): void {
    this.inspectorPlegado.set(true);
  }

  /** Estilo de la ventana: posición, tamaño y estado. */
  get estiloInspector(): Record<string, string> {
    if (this.inspectorMaximizado()) {
      return { left: '8px', top: '8px', right: '8px', bottom: '8px', width: 'auto', height: 'auto' };
    }

    return {
      left: `${this.inspectorPos().x}px`,
      top: `${this.inspectorPos().y}px`,
      width: `${this.inspectorTam().ancho}px`,
      height: this.inspectorMinimizado() ? 'auto' : `${this.inspectorTam().alto}px`,
    };
  }

  /**
   * Deja el lienzo compartible: marca sus piezas como visibles, lo pone público
   * y publica la empresa (sin empresa publicada el enlace no carga).
   */
  publicarLienzo(): void {
    const empresa = this.actual;
    if (!empresa) return;

    this.guardando.set(true);

    const visibles = this.componentes().map((item) => {
      if (!item.visible) this.modificados.add(item.clave);
      return { ...item, visible: true };
    });

    this.componentes.set(visibles);

    const publicarEmpresa = (): void => {
      this.empresaSvc.publicar(empresa.id, true).subscribe({
        next: () => {
          this.guardando.set(false);
          this.aviso.set('Lienzo publicado: sus piezas ya se ven en el enlace público.');
          this.pendientes.set(0);
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo publicar la empresa.'));
        },
      });
    };

    const diseno = this.disenoActivo();

    // 1) Si hay diseño con nombre: primero se pone público (así las piezas nacen visibles).
    const conDiseno = (despues: () => void): void => {
      if (!diseno) {
        despues();
        return;
      }

      this.empresaSvc.publicarDiseno(empresa.id, diseno.id, true).subscribe({
        next: (actualizado) => {
          this.disenoActivo.set(actualizado);
          despues();
        },
        error: () => despues(),
      });
    };

    // 2) Se guarda el lienzo con todas las piezas visibles y se adopta la respuesta del servidor.
    const guardar = (): void => {
      this.empresaSvc
        .guardarLienzo(empresa.id, visibles.map((item) => this.aComponente(item)), diseno?.id ?? null)
        .subscribe({
          next: (guardados) => {
            this.modificados.clear();
            this.eliminados.clear();
            this.pendientes.set(0);

            if (guardados?.length) {
              this.componentes.set(
                guardados.map((fila) => ({ ...fila, clave: fila.id ?? `tmp-${++this.contadorTemporal}` })),
              );
            }

            publicarEmpresa();
          },
          error: (err) => {
            this.guardando.set(false);
            this.error.set(mensajeDeError(err, 'No se pudo guardar el lienzo antes de publicar.'));
          },
        });
    };

    conDiseno(guardar);
  }

  alternarAyuda(): void {
    this.ayudaAbierta.update((valor) => !valor);
  }

  /** Arranca el arrastre del borde inferior de la hoja para cambiar su alto. */
  empezarAlto(evento: PointerEvent): void {
    if (typeof window === 'undefined') return;

    evento.preventDefault();
    evento.stopPropagation();

    const inicioY = evento.clientY;
    const altoInicial = this.altoVista();
    const escala = this.escala() || 1;

    const mover = (movimiento: PointerEvent): void => {
      const delta = (movimiento.clientY - inicioY) / escala;
      const alto = Math.max(LIENZO_ALTO, Math.min(6000, altoInicial + delta));
      this.altoVista.set(Math.round(alto));
    };

    const soltar = (): void => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      // El alto se guarda con el diseño para que la página pública use el mismo espacio.
      this.guardarAlto();
    };

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  /** Vuelve a la hoja clásica 1200 × 900 (útil si se alargó demasiado). */
  restablecerAlto(): void {
    this.altoVista.set(LIENZO_ALTO);
    this.guardarAlto();
  }

  get altoHoja(): number {
    return this.altoVista();
  }

  get altoHojaAjustado(): boolean {
    return this.altoVista() > LIENZO_ALTO;
  }

  /** Guarda el alto del lienzo en el diseño activo (o en la empresa si no hay diseño). */
  private guardarAlto(): void {
    const alto = this.altoVista();
    const diseno = this.disenoActivo();
    const empresa = this.actual;

    if (!empresa) return;

    if (diseno) {
      this.disenoActivo.set({ ...diseno, altoLienzo: alto });
      this.empresaSvc.actualizarDiseno(empresa.id, diseno.id, { altoLienzo: alto }).subscribe({
        error: () => this.error.set('No se pudo guardar el alto del lienzo.'),
      });
      return;
    }

    if (this.altoExtraGuardado === alto) return;
    this.altoExtraGuardado = alto;

    this.empresaSvc.guardarAltoLienzo(empresa.id, alto).subscribe({
      error: () => this.error.set('No se pudo guardar el alto del lienzo.'),
    });
  }

  alternarVistaLimpia(): void {
    const limpio = this.lateralPlegado() && this.inspectorPlegado();
    this.lateralPlegado.set(!limpio);
    this.inspectorPlegado.set(!limpio);
    setTimeout(() => this.calcularEscala(), 80);
  }

  get vistaLimpia(): boolean {
    return this.lateralPlegado() && this.inspectorPlegado();
  }

  icono(tipo: TipoComponente | string): string {
    return iconoComponente(tipo);
  }

  zIndex(componente: ComponenteEditor): number {
    return componente.detras ? 0 : componente.capa + 1;
  }

  seleccionar(componente: ComponenteEditor): void {
    if (!this.puedeTocar(componente)) {
      this.error.set(this.mensajeBloqueo);
      return;
    }
    this.seleccionClave.set(componente.clave);
    this.borradorContenido = leerJson<any>(componente.contenido, {});
    this.borradorEstilo = leerJson<any>(componente.estilo, {});
    if (this.inspectorPlegado()) this.inspectorPlegado.set(false);
  }

  deseleccionar(): void {
    this.seleccionClave.set(null);
    this.borradorContenido = {};
    this.borradorEstilo = {};
  }

  seleccionarPorClave(clave: string): void {
    const componente = this.componentes().find((item) => item.clave === clave);
    if (componente) this.seleccionar(componente);
  }

  agregar(tipo: TipoComponente): void {
    if (!this.puedeCrear) return;
    if (this.componentes().length >= 40) {
      this.error.set('El lienzo admite como máximo 40 componentes.');
      return;
    }

    const tamano = tamanoInicial(tipo);
    const contenido = leerJson<any>(contenidoInicial(tipo), {});
    const estilo = leerJson<any>(estiloInicial(tipo), {});
    if (this.fuenteNueva) estilo.fuente = this.fuenteNueva;

    const indice = this.componentes().length;
    const x = Math.min(LIENZO_ANCHO - tamano.ancho, 60 + (indice % 5) * 46);
    const y = Math.min(LIENZO_ALTO - tamano.alto, 60 + (indice % 4) * 42);

    const componente: ComponenteEditor = {
      clave: `tmp-${++this.contadorTemporal}`,
      id: null,
      tipo,
      nombre: this.catalogo.find((item) => item.tipo === tipo)?.etiqueta ?? tipo,
      contenido: JSON.stringify(contenido),
      estilo: JSON.stringify(estilo),
      x: Math.max(0, x),
      y: Math.max(0, y),
      ancho: tamano.ancho,
      alto: tamano.alto,
      capa: this.siguienteCapa(),
      detras: false,
      visible: true,
    };

    this.componentes.update((lista) => [...lista, componente]);
    this.seleccionar(componente);
    this.sentarComponente(componente);
    this.empujarHistorial();
    this.error.set(null);
  }

  agregarImagen(url: string): void {
    if (!url) return;
    this.agregar('IMAGEN');
    const seleccionado = this.seleccionado;
    if (!seleccionado) return;

    this.borradorContenido = { ...this.borradorContenido, url };
    this.aplicarContenido();
  }

  /** Deja el componente listo para trabajar: agranda la hoja hacia abajo si no cabe. */
  private sentarComponente(componente: ComponenteEditor): void {
    const altoNecesario = componente.y + componente.alto + 140;

    if (altoNecesario > this.altoVista()) {
      this.altoVista.set(Math.min(6000, Math.round(altoNecesario)));
      this.guardarAlto();
      setTimeout(() => this.calcularEscala(), 30);
    }
  }

  duplicar(): void {
    const original = this.seleccionado;
    if (!original || !this.puedeCrear) return;

    const copia: ComponenteEditor = {
      ...original,
      clave: `tmp-${++this.contadorTemporal}`,
      id: null,
      x: Math.min(LIENZO_ANCHO - original.ancho, original.x + 24),
      y: Math.min(LIENZO_ALTO - original.alto, original.y + 24),
      capa: this.siguienteCapa(),
      nombre: `${original.nombre ?? 'Componente'} (copia)`,
    };

    this.componentes.update((lista) => [...lista, copia]);
    this.seleccionar(copia);
    this.empujarHistorial();
  }

  eliminarSeleccionado(): void {
    const componente = this.seleccionado;
    if (!componente || !this.puedeTocar(componente)) return;

    if (componente.id) this.eliminados.add(componente.id);
    this.componentes.update((lista) => lista.filter((item) => item.clave !== componente.clave));
    this.deseleccionar();
    this.empujarHistorial();
  }

  subirCapa(componente: ComponenteEditor): void {
    if (!this.puedeTocar(componente)) return;
    const orden = [...this.componentes()].sort((a, b) => a.capa - b.capa);
    const indice = orden.findIndex((item) => item.clave === componente.clave);
    if (indice < 0 || indice === orden.length - 1) return;

    const siguiente = orden[indice + 1];
    const capa = componente.capa;
    componente.capa = siguiente.capa;
    siguiente.capa = capa;

    this.modificado(componente.clave);
    this.modificado(siguiente.clave);
    this.refrescar();
    this.empujarHistorial();
  }

  bajarCapa(componente: ComponenteEditor): void {
    if (!this.puedeTocar(componente)) return;
    const orden = [...this.componentes()].sort((a, b) => a.capa - b.capa);
    const indice = orden.findIndex((item) => item.clave === componente.clave);
    if (indice <= 0) return;

    const anterior = orden[indice - 1];
    const capa = componente.capa;
    componente.capa = anterior.capa;
    anterior.capa = capa;

    this.modificado(componente.clave);
    this.modificado(anterior.clave);
    this.refrescar();
    this.empujarHistorial();
  }

  alternarDetras(componente: ComponenteEditor): void {
    if (!this.puedeTocar(componente)) return;
    componente.detras = !componente.detras;
    this.modificado(componente.clave);
    this.refrescar();
    this.empujarHistorial();
  }

  alternarVisible(componente: ComponenteEditor): void {
    if (!this.puedeEditar) return;
    componente.visible = !componente.visible;
    this.modificado(componente.clave);
    this.refrescar();
    this.empujarHistorial();
  }

  empezarMover(evento: PointerEvent, componente: ComponenteEditor): void {
    this.iniciar(evento, componente, 'mover', '');
  }

  empezarRedimensionar(evento: PointerEvent, componente: ComponenteEditor, direccion: string): void {
    this.iniciar(evento, componente, 'redimensionar', direccion);
  }

  aplicarContenido(): void {
    const componente = this.seleccionado;
    if (!componente || !this.puedeTocar(componente)) return;

    const contenido = JSON.stringify(this.borradorContenido ?? {});
    this.actualizar(componente.clave, { contenido });
    this.modificado(componente.clave);
  }

  aplicarEstilo(): void {
    const componente = this.seleccionado;
    if (!componente || !this.puedeTocar(componente)) return;

    const estilo = JSON.stringify(this.borradorEstilo ?? {});
    this.actualizar(componente.clave, { estilo });
    this.modificado(componente.clave);
  }

  asignar(campo: string, valor: any): void {
    this.borradorContenido = { ...this.borradorContenido, [campo]: valor };
    this.aplicarContenido();
  }

  asignarEn(objeto: any, campo: string, valor: any): void {
    if (!objeto) return;
    objeto[campo] = valor;
    this.aplicarContenido();
  }

  asignarEstilo(campo: string, valor: any): void {
    this.borradorEstilo = { ...this.borradorEstilo, [campo]: valor };
    this.aplicarEstilo();
  }

  asignarNumero(campo: string, valor: any, defecto: number): void {
    const numero = Number(valor);
    this.asignarEstilo(campo, Number.isFinite(numero) ? numero : defecto);
  }

  cambiarNombreComponente(valor: string): void {
    const componente = this.seleccionado;
    if (!componente || !this.puedeTocar(componente)) return;
    this.actualizar(componente.clave, { nombre: valor });
    this.modificado(componente.clave);
  }

  cambiarGeometria(campo: 'x' | 'y' | 'ancho' | 'alto' | 'capa', valor: any): void {
    const componente = this.seleccionado;
    if (!componente || !this.puedeTocar(componente)) return;

    let numero = Math.round(Number(valor));
    if (!Number.isFinite(numero)) numero = 0;

    if (campo === 'ancho') numero = Math.max(40, Math.min(LIENZO_ANCHO, numero));
    if (campo === 'alto') numero = Math.max(24, Math.min(LIENZO_ALTO, numero));
    if (campo === 'x') numero = Math.max(0, Math.min(LIENZO_ANCHO - componente.ancho, numero));
    if (campo === 'y') numero = Math.max(0, Math.min(LIENZO_ALTO - componente.alto, numero));
    if (campo === 'capa') numero = Math.max(0, Math.min(999, numero));

    this.actualizar(componente.clave, { [campo]: numero } as Partial<ComponenteEditor>);
    this.modificado(componente.clave);
  }

  imagenComponenteDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagenEn(input, (url) => this.asignar('url', url), 1_900_000);
  }

  cambiarLista(valor: string): void {
    const items = valor
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => Boolean(item));
    this.asignar('items', items);
  }

  agregarGrupoMenu(): void {
    const grupos = Array.isArray(this.borradorContenido?.grupos) ? this.borradorContenido.grupos : [];
    grupos.push({ titulo: 'Nueva sección', items: [{ nombre: 'Nuevo plato', precio: '', descripcion: '' }] });
    this.asignar('grupos', grupos);
  }

  quitarGrupoMenu(indice: number): void {
    const grupos = this.borradorContenido?.grupos ?? [];
    grupos.splice(indice, 1);
    this.asignar('grupos', grupos);
  }

  agregarPlato(grupo: MenuGrupo): void {
    grupo.items = grupo.items ?? [];
    grupo.items.push({ nombre: 'Nuevo plato', precio: '', descripcion: '' });
    this.asignar('grupos', this.borradorContenido.grupos);
  }

  quitarPlato(grupo: MenuGrupo, indice: number): void {
    grupo.items.splice(indice, 1);
    this.asignar('grupos', this.borradorContenido.grupos);
  }

  alternarDestacado(item: any): void {
    item.destacado = !item.destacado;
    this.asignar('grupos', this.borradorContenido.grupos);
  }

  agregarFilaHorario(): void {
    const filas = Array.isArray(this.borradorContenido?.filas) ? this.borradorContenido.filas : [];
    filas.push({ dias: 'Nuevo día', hora: '9:00 a. m. - 6:00 p. m.' });
    this.asignar('filas', filas);
  }

  quitarFilaHorario(indice: number): void {
    const filas = this.borradorContenido?.filas ?? [];
    filas.splice(indice, 1);
    this.asignar('filas', filas);
  }

  quitarImagenGaleria(indice: number): void {
    const imagenes = this.borradorContenido?.imagenes ?? [];
    imagenes.splice(indice, 1);
    this.asignar('imagenes', imagenes);
  }

  imagenProductoDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagenEn(input, (url) => this.asignar('imagen', url));
  }

  imagenGaleriaDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagenEn(input, (url) => {
      const imagenes = Array.isArray(this.borradorContenido?.imagenes) ? [...this.borradorContenido.imagenes] : [];
      imagenes.push(url);
      this.asignar('imagenes', imagenes);
    });
  }

  imagenLienzoDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagenEn(input, (url) => this.agregarImagen(url));
  }

  get largoHtml(): number {
    return (this.borradorContenido?.html ?? '').length;
  }

  /** El HTML se guarda tal cual: el backend lo limpia y la vista lo publica en un iframe aislado. */
  cambiarHtml(valor: string): void {
    const componente = this.seleccionado;
    if (!componente || !this.puedeTocar(componente)) return;

    if ((valor ?? '').length > this.maxHtml) {
      this.error.set('El HTML es muy grande. Divídelo en varias piezas o carga imágenes por URL.');
    }

    this.htmlPendiente = valor ?? '';

    clearTimeout(this.temporizadorHtml);
    this.temporizadorHtml = setTimeout(() => {
      if (this.htmlPendiente === null) return;
      const pendiente = this.htmlPendiente;
      this.htmlPendiente = null;
      this.asignar('html', pendiente);
      this.refrescar();
    }, 250);
  }

  htmlDesdeArchivo(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    if (!/\.html?$/i.test(archivo.name)) {
      this.error.set('El archivo debe ser .html');
      return;
    }

    if (archivo.size > this.maxHtml) {
      this.error.set('El archivo es muy grande. Divídelo en varias piezas.');
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      this.error.set(null);
      this.cambiarHtml(String(lector.result ?? ''));
    };
    lector.onerror = () => this.error.set('No se pudo leer el archivo.');
    lector.readAsText(archivo);
  }

  async pegarHtmlDelPortapapeles(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      this.error.set('Tu navegador no deja leer el portapapeles. Pega dentro del cuadro de código.');
      return;
    }

    try {
      const texto = await navigator.clipboard.readText();
      if (!texto.trim()) {
        this.error.set('El portapapeles está vacío.');
        return;
      }
      this.error.set(null);
      this.cambiarHtml(texto);
    } catch {
      this.error.set('No se pudo leer el portapapeles. Pega dentro del cuadro de código.');
    }
  }

  usarPlantillaHtml(): void {
    this.cambiarHtml(this.soloDisenoHtml ? PLANTILLA_HTML_ESTATICA : PLANTILLA_HTML);
  }

  /** true cuando la pieza se limita a HTML + CSS, sin scripts ni controles. */
  get soloDisenoHtml(): boolean {
    return this.borradorContenido?.sinScripts === true;
  }

  /** Cambia el modo de la pieza sin tocar lo que ya está escrito en el cuadro. */
  alternarSoloDiseno(valor: boolean): void {
    const componente = this.seleccionado;
    if (!componente || !this.puedeTocar(componente)) return;

    this.borradorContenido = { ...(this.borradorContenido ?? {}), sinScripts: valor };
    this.asignar('sinScripts', valor);

    this.aviso.set(
      valor
        ? 'Modo solo diseño: al guardar se quitarán scripts y controles (botones, acordeones).'
        : 'Modo interactivo: el HTML puede traer sus propios scripts.',
    );
  }

  /** Pieza lista para pintar: el seleccionado se pinta desde el borrador para verlo al escribir. */
  vistaDe(componente: ComponenteEditor): ComponenteLienzo {
    if (this.seleccionClave() !== componente.clave) return componente;

    return { ...componente, contenido: JSON.stringify(this.borradorContenido ?? {}) };
  }

  alternarCodigoHtml(): void {
    this.mostrarCodigoHtml.update((valor) => !valor);
  }

  /** Texto del HTML guardado en la pieza seleccionada (para revisarlo sin el iframe). */
  get codigoHtmlGuardado(): string {
    const componente = this.seleccionado;
    if (!componente) return '';
    return String(this.borradorContenido?.html ?? '').trim() || leerJson<any>(componente.contenido, {}).html || '';
  }

  /**
   * Repara el HTML que llegó escapado (\n y \" literales) y lo deja limpio en el cuadro.
   * Sirve para piezas viejas que se guardaron doblemente codificadas.
   */
  desescaparHtmlGuardado(): void {
    const texto = this.codigoHtmlGuardado;
    if (!texto) return;

    const limpio = texto
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");

    this.cambiarHtml(limpio);
    this.aviso.set('Saltos de línea reparados. Guarda para aplicarlo.');
  }

  /** Estira la pieza HTML hasta el alto del lienzo: evita que el contenido quede fuera. */
  ajustarAltaHtml(): void {
    const componente = this.seleccionado;
    if (!componente || !this.puedeTocar(componente)) return;

    const alto = Math.max(320, this.altoHoja - componente.y - 24);
    this.cambiarGeometria('alto', alto);
    this.refrescar();
  }

  /** Estado legible de la pieza HTML: cuánto mide y en qué modo está. */
  get resumenContenidoHtml(): string {
    const largo = (this.borradorContenido?.html ?? '').length;
    const modo = this.soloDisenoHtml ? 'solo diseño' : 'interactivo';
    const ajuste = this.ajusteHtml === 'seccion' ? 'solo sección' : 'cubre la pieza';
    const guardado = this.seleccionado?.id ? 'guardada' : 'sin guardar';

    return largo
      ? `${largo} caracteres · ${modo} · ${ajuste} · ${guardado}`
      : `HTML vacío · ${modo} · ${ajuste} · ${guardado}`;
  }

  /** 'cubrir' = el HTML llena toda la pieza; 'seccion' = ocupa solo su contenido. */
  elegirAjusteHtml(valor: 'cubrir' | 'seccion'): void {
    const componente = this.seleccionado;
    if (!componente || !this.puedeTocar(componente)) return;

    this.asignar('ajuste', valor);
    this.aviso.set(
      valor === 'cubrir'
        ? 'El HTML llenará toda la pieza.'
        : 'El HTML ocupará solo su contenido; el resto de la pieza queda libre.',
    );
  }

  get ajusteHtml(): 'cubrir' | 'seccion' {
    return this.borradorContenido?.ajuste === 'seccion' ? 'seccion' : 'cubrir';
  }

  /** Deja en el cuadro la plantilla de solo diseño, sin scripts. */
  cargarPlantillaDiseno(): void {
    this.cambiarHtml(PLANTILLA_HTML_ESTATICA);
    if (!this.soloDisenoHtml) this.asignar('sinScripts', true);
  }

  aplicarFuente(valor: string): void {
    if (!this.seleccionado) {
      this.fuenteNueva = valor;
      return;
    }
    this.asignarEstilo('fuente', valor);
  }

  elegirAcento(color: string): void {
    this.disenoAcento = color;
  }

  elegirSecundario(color: string): void {
    this.disenoSecundario = color;
  }

  /**
   * Los componentes los guarda el autoguardado del lienzo, pero la marca (colores, fondo y CSS)
   * se guarda en otra llamada. Sin esto el diseño se perdía al recargar.
   */
  guardarMarcaSiCambio(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeEditar || this.guardandoMarca) return;

    const acento = this.disenoAcento || null;
    const secundario = this.disenoSecundario || null;
    const fondo = this.disenoFondo || null;
    const css = this.disenoCss || null;

    const guardado = this.disenoGuardado;
    const igual =
      (guardado?.acento ?? null) === acento &&
      (guardado?.secundario ?? null) === secundario &&
      (guardado?.fondoUrl ?? null) === fondo &&
      (guardado?.css ?? null) === css;

    if (igual) return;
    this.guardarMarca(true);
  }

  fondoDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagenEn(input, (url) => (this.disenoFondo = url), 1_900_000);
  }

  quitarFondo(): void {
    this.disenoFondo = '';
  }

  guardarMarca(automatico = false): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeEditar || this.guardandoMarca) return;

    this.guardandoMarca = true;
    this.erroresDiseno = [];

    const enviado: DisenoEmpresa = {
      acento: this.disenoAcento || null,
      secundario: this.disenoSecundario || null,
      fondoUrl: this.disenoFondo || null,
      css: this.disenoCss || null,
      activo: true,
    };

    this.empresaSvc
      .guardarDiseno(empresa.id, enviado)
      .pipe(finalize(() => (this.guardandoMarca = false)))
      .subscribe({
        next: (diseno) => {
          if (diseno.errores?.length) {
            this.erroresDiseno = diseno.errores;
            return;
          }

          this.disenoGuardado = {
            acento: diseno.acento ?? enviado.acento,
            secundario: diseno.secundario ?? enviado.secundario,
            fondoUrl: diseno.fondoUrl ?? enviado.fondoUrl,
            css: diseno.css ?? enviado.css,
            activo: diseno.activo,
          };

          this.disenoSvc.aplicarAjeno(this.aDiseno(this.disenoGuardado));
          this.aviso.set(automatico ? 'Marca guardada automáticamente.' : 'Identidad de marca guardada.');
        },
        error: (err) => (this.erroresDiseno = [mensajeDeError(err, 'No se pudo guardar la marca.')]),
      });
  }

  deshacer(): void {
    if (!this.puedeDeshacer) return;
    this.posicionHistorial -= 1;
    this.aplicarFoto(this.historial[this.posicionHistorial]);
  }

  rehacer(): void {
    if (!this.puedeRehacer) return;
    this.posicionHistorial += 1;
    this.aplicarFoto(this.historial[this.posicionHistorial]);
  }

  acercar(): void {
    this.zoom.update((valor) => Math.min(1.6, Math.round((valor + 0.1) * 10) / 10));
  }

  alejar(): void {
    this.zoom.update((valor) => Math.max(0.4, Math.round((valor - 0.1) * 10) / 10));
  }

  ajustarVista(): void {
    this.zoom.set(1);
    this.calcularEscala();
  }

  guardar(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeCrear) return;

    this.guardarMarcaSiCambio();

    if (this.puedeEditar) {
      this.guardarTodo(empresa);
      return;
    }

    this.guardarParcial(empresa);
  }

  guardarYPublicar(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedePublicar) return;

    this.guardarMarcaSiCambio();
    this.guardando.set(true);
    this.error.set(null);

    const guardado = this.puedeEditar ? this.componentes().map((item) => this.aComponente(item)) : null;

    const finalizar = (): void => {
      this.empresaSvc
        .publicar(empresa.id, true)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe({
          next: () => {
            this.aviso.set('Lienzo guardado y empresa publicada.');
            this.recargar();
          },
          error: (err) => this.error.set(mensajeDeError(err, 'No se pudo publicar la empresa.')),
        });
    };

    if (guardado) {
      this.empresaSvc.guardarLienzo(empresa.id, guardado, this.disenoActivo()?.id ?? null).subscribe({
        next: () => finalizar(),
        error: (err) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo guardar el lienzo.'));
        },
      });
      return;
    }

    this.guardarParcial(empresa, () => finalizar());
  }

  volver(): void {
    this.router.navigate(['/app/empresa']);
  }

  private iniciar(
    evento: PointerEvent,
    componente: ComponenteEditor,
    modo: 'mover' | 'redimensionar',
    direccion: string,
  ): void {
    if (!this.puedeTocar(componente)) {
      this.error.set(this.mensajeBloqueo);
      return;
    }
    if (!this.puedeCrear) return;
    if (evento.button !== 0) return;

    evento.preventDefault();
    evento.stopPropagation();
    this.seleccionar(componente);

    this.arrastre = {
      clave: componente.clave,
      modo,
      direccion,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      x: componente.x,
      y: componente.y,
      ancho: componente.ancho,
      alto: componente.alto,
    };

    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('pointermove', this.moverListener);
      window.addEventListener('pointerup', this.soltarListener);
    }
  }

  private mover(evento: PointerEvent): void {
    if (!this.arrastre) return;
    const componente = this.componentes().find((item) => item.clave === this.arrastre?.clave);
    if (!componente) return;

    const escala = this.escala();
    const dx = (evento.clientX - this.arrastre.inicioX) / escala;
    const dy = (evento.clientY - this.arrastre.inicioY) / escala;

    if (this.arrastre.modo === 'mover') {
      let x = this.arrastre.x + dx;
      let y = this.arrastre.y + dy;

      if (this.ajustarCuadricula()) {
        x = Math.round(x / 8) * 8;
        y = Math.round(y / 8) * 8;
      }

      componente.x = Math.round(Math.max(0, Math.min(LIENZO_ANCHO - componente.ancho, x)));
      componente.y = Math.round(Math.max(0, Math.min(LIENZO_ALTO - componente.alto, y)));
      this.refrescar();
      return;
    }

    this.redimensionar(componente, dx, dy);
    this.refrescar();
  }

  private redimensionar(componente: ComponenteEditor, dx: number, dy: number): void {
    if (!this.arrastre) return;

    const direccion = this.arrastre.direccion;
    let x = this.arrastre.x;
    let y = this.arrastre.y;
    let ancho = this.arrastre.ancho;
    let alto = this.arrastre.alto;

    if (direccion.includes('e')) ancho = this.arrastre.ancho + dx;
    if (direccion.includes('s')) alto = this.arrastre.alto + dy;
    if (direccion.includes('w')) {
      ancho = this.arrastre.ancho - dx;
      x = this.arrastre.x + dx;
    }
    if (direccion.includes('n')) {
      alto = this.arrastre.alto - dy;
      y = this.arrastre.y + dy;
    }

    if (this.ajustarCuadricula()) {
      ancho = Math.round(ancho / 8) * 8;
      alto = Math.round(alto / 8) * 8;
      x = Math.round(x / 8) * 8;
      y = Math.round(y / 8) * 8;
    }

    ancho = Math.max(40, Math.min(LIENZO_ANCHO - x, ancho));
    alto = Math.max(24, Math.min(LIENZO_ALTO - y, alto));
    x = Math.max(0, Math.min(LIENZO_ANCHO - ancho, x));
    y = Math.max(0, Math.min(LIENZO_ALTO - alto, y));

    componente.x = Math.round(x);
    componente.y = Math.round(y);
    componente.ancho = Math.round(ancho);
    componente.alto = Math.round(alto);
  }

  private soltar(): void {
    if (!this.arrastre) return;

    this.modificado(this.arrastre.clave);
    this.arrastre = null;
    this.empujarHistorial();

    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('pointermove', this.moverListener);
      window.removeEventListener('pointerup', this.soltarListener);
    }
  }

  private alTeclado(evento: KeyboardEvent): void {
    const objetivo = evento.target as HTMLElement | null;
    const escribiendo =
      objetivo?.tagName === 'INPUT' ||
      objetivo?.tagName === 'TEXTAREA' ||
      objetivo?.tagName === 'SELECT' ||
      objetivo?.isContentEditable;

    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'z') {
      if (escribiendo) return;
      evento.preventDefault();
      if (evento.shiftKey) this.rehacer();
      else this.deshacer();
      return;
    }

    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'y') {
      if (escribiendo) return;
      evento.preventDefault();
      this.rehacer();
      return;
    }

    if (escribiendo) return;

    const componente = this.seleccionado;
    if (!componente) return;

    if (evento.key === 'Escape') {
      this.deseleccionar();
      return;
    }

    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'd') {
      evento.preventDefault();
      this.duplicar();
      return;
    }

    if (evento.key === 'Delete' || evento.key === 'Backspace') {
      evento.preventDefault();
      this.eliminarSeleccionado();
      return;
    }

    const paso = evento.shiftKey ? 10 : 2;
    let dx = 0;
    let dy = 0;

    if (evento.key === 'ArrowLeft') dx = -paso;
    if (evento.key === 'ArrowRight') dx = paso;
    if (evento.key === 'ArrowUp') dy = -paso;
    if (evento.key === 'ArrowDown') dy = paso;

    if (!dx && !dy) return;
    evento.preventDefault();

    componente.x = Math.max(0, Math.min(LIENZO_ANCHO - componente.ancho, componente.x + dx));
    componente.y = Math.max(0, Math.min(LIENZO_ALTO - componente.alto, componente.y + dy));
    this.modificado(componente.clave);
    this.refrescar();
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.error.set(null);

    this.empresaSvc.cargarPanel(id).subscribe((panel) => {
      if (!panel) {
        this.cargando.set(false);
        this.error.set('No se pudo cargar el lienzo. Revisa tu conexión o tus permisos.');
        return;
      }

      this.aplicarPanel(panel);
      this.cargarDisenoDeLaRuta(id);
    });
  }

  /** Si la URL trae ?diseno=, se trabaja sobre ese diseño; si no, sobre el lienzo general. */
  private cargarDisenoDeLaRuta(empresaId: string): void {
    const disenoId = this.route.snapshot.queryParamMap.get('diseno');

    if (!disenoId) {
      this.empresaSvc.altoLienzo(empresaId).subscribe((alto) => {
        this.altoExtraGuardado = alto;
        this.altoVista.set(alto > 0 ? alto : LIENZO_ALTO);
        this.cargando.set(false);
        setTimeout(() => this.calcularEscala(), 60);
      });
      return;
    }

    this.empresaSvc.listarDisenos(empresaId).subscribe((lista) => {
      const diseno = lista.find((item) => item.id === disenoId) ?? null;
      this.disenoActivo.set(diseno);

      if (!diseno) {
        this.cargando.set(false);
        this.error.set('Ese diseño ya no existe. Vuelve a Mis diseños.');
        return;
      }

      this.altoVista.set(diseno.altoLienzo && diseno.altoLienzo > 0 ? diseno.altoLienzo : LIENZO_ALTO);

      this.empresaSvc.piezasDiseno(empresaId, disenoId).subscribe((piezas) => {
        this.componentes.set(
          piezas.map((componente, indice) => ({
            ...componente,
            clave: componente.id ?? `tmp-${++this.contadorTemporal}-${indice}`,
            visible: componente.visible ?? true,
            detras: componente.detras ?? false,
          })),
        );
        this.modificados.clear();
        this.eliminados.clear();
        this.deseleccionar();
        this.iniciarHistorial();
        this.cargando.set(false);
      });
    });
  }

  private aplicarPanel(panel: PanelEmpresa): void {
    this.componentes.set(
      panel.componentes.map((componente, indice) => ({
        ...componente,
        clave: componente.id ?? `tmp-${++this.contadorTemporal}-${indice}`,
        visible: componente.visible ?? true,
        detras: componente.detras ?? false,
      })),
    );

    this.modificados.clear();
    this.eliminados.clear();
    this.deseleccionar();
    this.iniciarHistorial();

    this.disenoAcento = panel.diseno.acento ?? '#2563eb';
    this.disenoSecundario = panel.diseno.secundario ?? '#0ea5e9';
    this.disenoFondo = panel.diseno.fondoUrl ?? '';
    this.disenoCss = panel.diseno.css ?? '';
    this.disenoGuardado = {
      acento: panel.diseno.acento ?? null,
      secundario: panel.diseno.secundario ?? null,
      fondoUrl: panel.diseno.fondoUrl ?? null,
      css: panel.diseno.css ?? null,
      activo: panel.diseno.activo,
    };

    this.disenoSvc.aplicarAjeno(this.aDiseno(panel.diseno));
    setTimeout(() => this.calcularEscala(), 60);
  }

  private recargar(): void {
    const id = this.actual?.id;
    if (!id) return;

    this.empresaSvc.cargarPanel(id).subscribe((panel) => {
      if (panel) this.aplicarPanel(panel);
    });
  }

  private guardarTodo(empresa: Empresa, automatico = false): void {
    this.guardando.set(true);
    this.error.set(null);

    this.empresaSvc
      .guardarLienzo(
        empresa.id,
        this.componentes().map((item) => this.aComponente(item)),
        this.disenoActivo()?.id ?? null,
      )
      .pipe(finalize(() => (this.guardando.set(false))))
      .subscribe({
        next: (guardados) => {
          this.adoptarIdentidades(guardados);
          this.aviso.set(automatico ? 'Guardado automático.' : 'Lienzo guardado.');
          // No se recarga el panel: si llega mientras escribes, borraría lo que estás editando.
          this.marcarGuardado();
        },
        error: (err) => this.fallar(err, automatico),
      });
  }

  private guardarParcial(empresa: Empresa, despues?: () => void, automatico = false): void {
    if (!this.puedeCrear) return;

    const nuevos = this.componentes().filter((item) => !item.id);
    const modificados = this.componentes().filter((item) => item.id && this.modificados.has(item.clave));
    const eliminados = Array.from(this.eliminados);

    if (!nuevos.length && !modificados.length && !eliminados.length) {
      despues?.();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    // Los nuevos primero: el servidor devuelve su id y así los siguientes pasos ya lo conocen.
    const tareas: (() => any)[] = [
      ...nuevos.map((item) => () =>
        this.empresaSvc
          .crearComponente(empresa.id, this.aComponente(item), this.disenoActivo()?.id ?? null)
          .pipe(
          tap((creado) => this.asignarId(item.clave, creado)),
        ),
      ),
      ...modificados.map((item) => () => this.empresaSvc.moverComponente(empresa.id, this.aComponente(item))),
      ...eliminados.map((id) => () => this.empresaSvc.borrarComponente(empresa.id, id)),
    ];

    this.ejecutarSecuencia(tareas, () => {
      this.guardando.set(false);
      this.marcarGuardado();
      this.aviso.set(
        automatico
          ? 'Borrador guardado automáticamente.'
          : 'Cambios guardados como borrador. Un editor los publicará.',
      );
      if (despues) despues();
      else if (!automatico) this.recargar();
    }, automatico);
  }

  private ejecutarSecuencia(tareas: (() => any)[], fin: () => void, automatico = false): void {
    let indice = 0;

    const siguiente = (): void => {
      if (indice >= tareas.length) {
        fin();
        return;
      }

      const tarea = tareas[indice++];
      tarea().subscribe({
        next: () => siguiente(),
        error: (err: any) => this.fallar(err, automatico),
      });
    };

    siguiente();
  }

  /** Tras guardar no se recarga el panel: se limpia la marca de cambios y se sigue editando. */
  private marcarGuardado(): void {
    this.modificados.clear();
    this.eliminados.clear();
    this.pendientes.set(0);
    clearTimeout(this.temporizadorAutoguardado);
  }

  private fallar(err: any, automatico: boolean): void {
    this.guardando.set(false);
    this.error.set(mensajeDeError(err, 'No se pudo guardar el lienzo. Revisa tu sesión y vuelve a intentar.'));
    if (!automatico) this.pendientes.update((valor) => Math.max(valor, 1));
  }

  private asignarId(clave: string, creado: ComponenteLienzo): void {
    if (!creado?.id) return;

    this.componentes.update((lista) =>
      lista.map((item) => (item.clave === clave ? { ...item, id: creado.id } : item)),
    );
  }

  /** Después del guardado completo el servidor devuelve los ids: se enlazan por posición de envío. */
  private adoptarIdentidades(guardados: ComponenteLienzo[]): void {
    if (!guardados?.length) return;

    this.componentes.update((lista) =>
      lista.map((item) => {
        if (item.id) return item;
        const coincidencia = guardados.find(
          (guardado) =>
            guardado.tipo === item.tipo &&
            guardado.x === Math.round(item.x) &&
            guardado.y === Math.round(item.y),
        );
        return coincidencia?.id ? { ...item, id: coincidencia.id } : item;
      }),
    );
  }

  private aComponente(componente: ComponenteEditor): ComponenteLienzo {
    return {
      id: componente.id ?? null,
      tipo: componente.tipo,
      nombre: componente.nombre ?? null,
      contenido: componente.contenido,
      estilo: componente.estilo,
      x: Math.round(componente.x),
      y: Math.round(componente.y),
      ancho: Math.round(componente.ancho),
      alto: Math.round(componente.alto),
      capa: Math.round(componente.capa),
      detras: Boolean(componente.detras),
      visible: Boolean(componente.visible),
    };
  }

  private aDiseno(diseno: DisenoEmpresa): any {
    return {
      acento: diseno.acento ?? null,
      secundario: diseno.secundario ?? null,
      fondoUrl: diseno.fondoUrl ?? null,
      css: diseno.css ?? null,
      activo: diseno.activo,
    };
  }

  private actualizar(clave: string, cambio: Partial<ComponenteEditor>): void {
    this.componentes.update((lista) =>
      lista.map((item) => (item.clave === clave ? { ...item, ...cambio } : item)),
    );
  }

  private refrescar(): void {
    this.componentes.update((lista) => [...lista]);
  }

  private modificado(clave: string): void {
    this.modificados.add(clave);
    this.pendientes.update((valor) => valor + 1);
    this.programarAutoguardado();
  }

  /**
   * Guarda solo, dos segundos después del último cambio. Es lo que evita perder el diseño
   * cuando se recarga, se cierra la pestaña o el editor se queda sin sesión.
   */
  private programarAutoguardado(): void {
    clearTimeout(this.temporizadorAutoguardado);

    this.temporizadorAutoguardado = setTimeout(() => {
      const empresa = this.actual;

      if (!empresa || this.guardando() || !this.puedeCrear) return;
      if (!this.modificados.size && !this.eliminados.size && !this.hayNuevos()) return;

      this.aviso.set(null);

      this.guardarMarcaSiCambio();

      // Se guarda por partes (crear, mover, borrar) para que un fallo no arrastre todo el lienzo.
      this.guardarParcial(empresa, undefined, true);
    }, 2000);
  }

  private hayNuevos(): boolean {
    return this.componentes().some((item) => !item.id);
  }

  /** Reintento manual: guarda todo lo pendiente con el botón Guardar. */
  guardarAhora(): void {
    this.guardar();
  }

  private siguienteCapa(): number {
    return this.componentes().reduce((maximo, item) => Math.max(maximo, item.capa), 0) + 1;
  }

  private iniciarHistorial(): void {
    this.historial = [this.foto()];
    this.posicionHistorial = 0;
  }

  private empujarHistorial(): void {
    const foto = this.foto();
    if (this.historial[this.posicionHistorial] === foto) return;

    this.historial = this.historial.slice(0, this.posicionHistorial + 1);
    this.historial.push(foto);
    if (this.historial.length > 60) this.historial.shift();
    this.posicionHistorial = this.historial.length - 1;
  }

  private foto(): string {
    return JSON.stringify(this.componentes().map((item) => ({ ...item, clave: undefined })));
  }

  private aplicarFoto(foto: string): void {
    try {
      const datos = JSON.parse(foto) as ComponenteLienzo[];
      this.componentes.set(
        datos.map((componente, indice) => ({
          ...componente,
          clave: componente.id ?? `tmp-${++this.contadorTemporal}-${indice}`,
        })),
      );
      this.deseleccionar();
    } catch {
      this.error.set('No se pudo restaurar el estado anterior.');
    }
  }

  private calcularEscala(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const marco = this.marco?.nativeElement;
    if (!marco) return;

    const disponible = marco.clientWidth - 32;
    const altoHoja = this.altoHoja;

    if (disponible <= 0) return;

    // El ancho manda: la hoja usa todo el ancho y el alto se recorre con desplazamiento.
    const escala = disponible / LIENZO_ANCHO;

    this.escalaBase.set(Math.max(0.12, Math.min(1.6, escala)));
  }

  private cargarImagenEn(input: HTMLInputElement, asignar: (url: string) => void, maximo = 1_400_000): void {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    leerImagen(archivo, maximo).then(
      (url) => {
        this.error.set(null);
        asignar(url);
      },
      (error: Error) => this.error.set(error.message),
    );
  }
}

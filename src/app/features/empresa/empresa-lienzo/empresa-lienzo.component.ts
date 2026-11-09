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
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  ComponenteLienzo,
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
  private platformId = inject(PLATFORM_ID);

  @ViewChild('marco') marco?: ElementRef<HTMLElement>;

  readonly panel = this.empresaSvc.panel;
  readonly ancho = LIENZO_ANCHO;
  readonly alto = LIENZO_ALTO;
  readonly fuentes = FUENTES;
  readonly paleta = PALETA_MARCA;

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

  private arrastre: Arrastre | null = null;
  private modificados = new Set<string>();
  private eliminados = new Set<string>();
  private historial: string[] = [];
  private posicionHistorial = -1;
  private contadorTemporal = 0;
  private ajustar = (): void => this.calcularEscala();
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
    setTimeout(() => this.calcularEscala(), 60);
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.ajustar);
      window.removeEventListener('keydown', this.tecla);
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

  fondoDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagenEn(input, (url) => (this.disenoFondo = url), 1_900_000);
  }

  quitarFondo(): void {
    this.disenoFondo = '';
  }

  guardarMarca(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeEditar) return;

    this.guardandoMarca = true;
    this.erroresDiseno = [];

    this.empresaSvc
      .guardarDiseno(empresa.id, {
        acento: this.disenoAcento || null,
        secundario: this.disenoSecundario || null,
        fondoUrl: this.disenoFondo || null,
        css: this.disenoCss || null,
        activo: true,
      })
      .pipe(finalize(() => (this.guardandoMarca = false)))
      .subscribe({
        next: (diseno) => {
          if (diseno.errores?.length) {
            this.erroresDiseno = diseno.errores;
            return;
          }
          this.disenoSvc.aplicarAjeno(this.aDiseno(diseno));
          this.aviso.set('Identidad de marca guardada.');
        },
        error: (err) => this.erroresDiseno = [mensajeDeError(err, 'No se pudo guardar la marca.')],
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

    if (this.puedeEditar) {
      this.guardarTodo(empresa);
      return;
    }

    this.guardarParcial(empresa);
  }

  guardarYPublicar(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedePublicar) return;

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
      this.empresaSvc.guardarLienzo(empresa.id, guardado).subscribe({
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
      this.cargando.set(false);
      if (!panel) {
        this.error.set('No se pudo cargar el lienzo. Revisa tu conexión o tus permisos.');
        return;
      }
      this.aplicarPanel(panel);
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

  private guardarTodo(empresa: Empresa): void {
    this.guardando.set(true);
    this.error.set(null);

    this.empresaSvc
      .guardarLienzo(empresa.id, this.componentes().map((item) => this.aComponente(item)))
      .pipe(finalize(() => (this.guardando.set(false))))
      .subscribe({
        next: () => {
          this.aviso.set('Lienzo guardado.');
          this.recargar();
        },
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo guardar el lienzo.')),
      });
  }

  private guardarParcial(empresa: Empresa, despues?: () => void): void {
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

    const pendientes = [
      ...nuevos.map((item) => () => this.empresaSvc.crearComponente(empresa.id, this.aComponente(item))),
      ...modificados.map((item) => () => this.empresaSvc.moverComponente(empresa.id, this.aComponente(item))),
      ...eliminados.map((id) => () => this.empresaSvc.borrarComponente(empresa.id, id)),
    ];

    this.ejecutarSecuencia(pendientes, () => {
      this.guardando.set(false);
      this.aviso.set('Cambios guardados como borrador. Un editor los publicará.');
      if (despues) despues();
      else this.recargar();
    });
  }

  private ejecutarSecuencia(tareas: (() => any)[], fin: () => void): void {
    let indice = 0;

    const siguiente = (): void => {
      if (indice >= tareas.length) {
        fin();
        return;
      }

      const tarea = tareas[indice++];
      tarea().subscribe({
        next: () => siguiente(),
        error: (err: any) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudieron guardar todos los cambios.'));
        },
      });
    };

    siguiente();
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

    const disponible = marco.clientWidth - 24;
    if (disponible <= 0) return;
    this.escalaBase.set(Math.max(0.18, Math.min(1, disponible / LIENZO_ANCHO)));
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

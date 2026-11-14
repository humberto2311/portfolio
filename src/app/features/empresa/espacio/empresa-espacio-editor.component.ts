import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ComponenteLienzo,
  DisenoLienzo,
  EnlaceEspacio,
  EspacioEmpresa,
  EspacioForm,
  SeccionEspacio,
  TipoEnlaceEspacio,
  TipoSeccionEspacio,
} from '../../../core/models/empresa.model';
import { EmpresaService } from '../../../core/services/empresa.service';
import { DisenoService } from '../../../core/services/diseno.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';
import { leerImagen } from '../empresa-ui';
import { EspacioNavbarComponent } from './espacio-navbar.component';
import {
  CATALOGO_SECCIONES,
  ESTILOS_ESPACIO,
  ICONOS_ESPACIO,
  anclaSeccion,
  etiquetaSeccion,
  iconoSeccion,
  navbarInicial,
  seccionesIniciales,
  slugLibre,
  urlEspacio,
} from './espacio-ui';

type VistaEditor = 'estructura' | 'navbar' | 'secciones' | 'diseno';
type ModoEspacio = 'editar' | 'vista';

export interface ZonaSeccion {
  clave: string;
  etiqueta: string;
  icono: string;
  ayuda: string;
}

const ZONAS: ZonaSeccion[] = [
  { clave: 'contenedor', etiqueta: 'Contenedor centrado', icono: 'fa-solid fa-align-center', ayuda: 'Ancho cómodo de lectura, como una tarjeta.' },
  { clave: 'completo', etiqueta: 'Ancho completo', icono: 'fa-solid fa-maximize', ayuda: 'Ocupa todo el ancho de la página.' },
  { clave: 'izquierda', etiqueta: 'A la izquierda', icono: 'fa-solid fa-align-left', ayuda: 'Bloque alineado a la izquierda, con aire a la derecha.' },
  { clave: 'derecha', etiqueta: 'A la derecha', icono: 'fa-solid fa-align-right', ayuda: 'Bloque alineado a la derecha.' },
  { clave: 'mitad', etiqueta: 'Media página', icono: 'fa-solid fa-columns', ayuda: 'Ocupa la mitad del ancho disponible.' },
];

const ALINEACIONES: { valor: 'left' | 'center' | 'right'; etiqueta: string }[] = [
  { valor: 'left', etiqueta: 'Izquierda' },
  { valor: 'center', etiqueta: 'Centrado' },
  { valor: 'right', etiqueta: 'Derecha' },
];

interface SeccionEditor extends SeccionEspacio {
  clave: string;
}

@Component({
  selector: 'app-empresa-espacio-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EspacioNavbarComponent, EmpresaComponenteVistaComponent],
  templateUrl: './empresa-espacio-editor.component.html',
  styleUrls: ['./empresa-espacio-editor.component.scss'],
})
export class EmpresaEspacioEditorComponent implements OnInit, OnDestroy {
  private empresa = inject(EmpresaService);
  private diseno = inject(DisenoService);
  private toast = inject(ToastService);
  private perfiles = inject(UserProfileService);
  private plataforma = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly espacios = signal<EspacioEmpresa[]>([]);
  readonly actual = signal<EspacioEmpresa | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly vista = signal<VistaEditor>('estructura');
  readonly seccionAbierta = signal<string | null>(null);

  readonly catalogo = CATALOGO_SECCIONES;
  readonly estilos = ESTILOS_ESPACIO;
  readonly iconos = ICONOS_ESPACIO;
  readonly tiposEnlace: { valor: TipoEnlaceEspacio; etiqueta: string }[] = [
    { valor: 'ANCLA', etiqueta: 'Sección de esta página' },
    { valor: 'RUTA', etiqueta: 'Página de N-soft' },
    { valor: 'EXTERNO', etiqueta: 'Sitio externo' },
  ];

  readonly nuevaSeccion = signal<TipoSeccionEspacio>('SERVICIOS');
  readonly disenos = signal<DisenoLienzo[]>([]);
  readonly seccionDiseno = signal<string | null>(null);
  readonly piezas = signal<ComponenteLienzo[]>([]);
  readonly cambiosSinGuardar = signal(false);
  readonly zonas = ZONAS;
  readonly alineaciones = ALINEACIONES;
  readonly cambiando = signal(false);
  readonly modo = signal<ModoEspacio>('editar');
  readonly puedeEditar = computed(
    () => Boolean(this.empresa.acceso()?.editaLienzo || this.empresa.acceso()?.editaPerfil),
  );

  form: EspacioForm = {};
  navbar: EnlaceEspacio[] = [];
  secciones: SeccionEditor[] = [];

  ngOnInit(): void {
    this.modo.set(this.route.snapshot.data['modo'] === 'vista' ? 'vista' : 'editar');
    this.perfiles.cargarMiAvatar();

    this.empresa.cargarMis().subscribe((mias) => {
      if (!mias.length) {
        this.cargando.set(false);
        return;
      }

      const activa = this.empresa.activaId() ?? mias[0].id;
      if (!this.empresa.activaId()) this.empresa.entrar(activa);

      this.empresa.cargarPanel(activa).subscribe(() => this.cargarEspacios(activa));
    });
  }

  get enVista(): boolean {
    return this.modo() === 'vista';
  }

  ngOnDestroy(): void {
    this.diseno.limpiarAjeno();
  }

  get empresaActual() {
    return this.empresa.empresaActual();
  }

  /** Logo de la empresa: valor inicial del logo de un espacio nuevo. */
  get logoInicial(): string {
    return this.empresaActual?.logoUrl?.trim() || '';
  }

  /** Portada de la empresa: valor inicial de la portada de un espacio nuevo. */
  get portadaInicial(): string {
    return this.empresaActual?.portadaUrl?.trim() || '';
  }

  /** Vuelve a copiar la imagen de la empresa en este espacio (no toca el perfil de la empresa). */
  usarImagenDeLaEmpresa(campo: 'logoUrl' | 'portadaUrl'): void {
    const valor = campo === 'logoUrl' ? this.logoInicial : this.portadaInicial;
    if (!valor) {
      this.toast.show(
        campo === 'logoUrl'
          ? 'La empresa todavía no tiene logo: súbelo en Ajustes de la empresa'
          : 'La empresa todavía no tiene portada: súbela en Ajustes de la empresa',
      );
      return;
    }

    this.form[campo] = valor;
    this.cambiosSinGuardar.set(true);
    this.toast.show('Imagen copiada de la empresa. Puedes cambiarla sin tocar la empresa');
  }

  /** Sube una imagen propia del espacio desde el equipo o el móvil. */
  subirImagen(campo: 'logoUrl' | 'portadaUrl', input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    leerImagen(archivo, 1_400_000).then(
      (url) => {
        this.form[campo] = url;
        this.cambiosSinGuardar.set(true);
        this.toast.show('Imagen cargada. Guarda el espacio para conservarla');
      },
      (error: Error) => this.toast.show(error.message),
    );
  }

  quitarImagen(campo: 'logoUrl' | 'portadaUrl'): void {
    this.form[campo] = '';
    this.cambiosSinGuardar.set(true);
  }

  /** Imágenes que no se pudieron cargar (por ejemplo, un base64 guardado a medias). */
  private readonly rotas = signal<Record<'portadaUrl' | 'logoUrl', boolean>>({
    portadaUrl: false,
    logoUrl: false,
  });

  get imagenPortada(): string | null {
    if (!this.rotas().portadaUrl) {
      const valor = (this.form.portadaUrl ?? '').trim();
      if (valor) return valor;
    }
    return this.portadaInicial || this.portadaDelPerfil || null;
  }

  get imagenLogo(): string | null {
    if (!this.rotas().logoUrl) {
      const propio = (this.form.logoUrl ?? '').trim();
      if (propio) return propio;
    }
    return this.logoInicial || this.fotoDelPerfil || null;
  }

  /** Una imagen guardada incompleta deja de mostrarse y se cae a la de la empresa. */
  imagenFallida(campo: 'portadaUrl' | 'logoUrl'): void {
    if (this.rotas()[campo]) return;
    this.rotas.update((valor) => ({ ...valor, [campo]: true }));
  }

  /** Aviso cuando la imagen guardada está dañada y se está mostrando otra. */
  get imagenDanada(): boolean {
    return this.rotas().portadaUrl || this.rotas().logoUrl;
  }

  get avisoImagen(): string {
    return 'La imagen guardada está incompleta y no se puede mostrar. Vuelve a subirla o usa la de la empresa.';
  }

  private get fotoDelPerfil(): string {
    return this.perfiles.avatar()?.trim() || '';
  }

  private get portadaDelPerfil(): string {
    return this.perfiles.portada()?.trim() || '';
  }

  get slugEmpresa(): string {
    return this.empresaActual?.slug ?? '';
  }

  get espacioSlug(): string {
    return this.form.slug ?? '';
  }

  get urlPublica(): string {
    if (this.enVista) return this.urlVista;
    return urlEspacio(this.slugEmpresa, this.espacioSlug);
  }

  get urlVista(): string {
    return urlEspacio(this.slugEmpresa, this.espacioSlug || 'mi-espacio');
  }

  get urlRed(): string {
    return this.slugEmpresa ? `/empresa/${this.slugEmpresa}` : '/app/empresa';
  }

  get esPrincipalActual(): boolean {
    return Boolean(this.form.esPrincipal);
  }

  irAEditar(): void {
    void this.router.navigateByUrl('/app/empresa/espacio');
  }

  irAlPerfil(): void {
    void this.router.navigateByUrl(this.urlRed);
  }

  get esNuevo(): boolean {
    return !this.actual();
  }

  get disenosPublicados(): DisenoLienzo[] {
    return this.disenos();
  }

  get urlVistaPrevia(): string {
    if (this.slugEmpresa && this.form.slug) {
      return `${urlEspacio(this.slugEmpresa, this.form.slug)}?vista=previa`;
    }
    return `/app/empresa/espacio/vista?espacio=${encodeURIComponent(this.form.slug || 'mi-espacio')}`;
  }

  disenoDeSeccion(seccion: SeccionEspacio): DisenoLienzo | null {
    if (!seccion.disenoSlug) return null;
    return this.disenos().find((diseno) => diseno.slug === seccion.disenoSlug) ?? null;
  }

  piezasDe(seccion: SeccionEspacio): ComponenteLienzo[] {
    const diseno = this.disenoDeSeccion(seccion);
    return diseno?.piezas ?? [];
  }

  abrirSelectorDiseno(seccion: SeccionEspacio): void {
    this.seccionDiseno.set(this.seccionDiseno() === this.claveActual(seccion) ? null : this.claveActual(seccion));
  }

  elegirDiseno(seccion: SeccionEspacio, diseno: DisenoLienzo | null): void {
    seccion.disenoSlug = diseno?.slug ?? null;
    if (diseno) {
      seccion.tipo = 'LIENZO';
      if (!seccion.titulo || seccion.titulo === 'Nueva sección') seccion.titulo = diseno.nombre;
    }
    this.seccionDiseno.set(null);
    this.toast.show(diseno ? `«${diseno.nombre}» se mostrará en esta sección` : 'Sección sin diseño');
  }

  crearSeccionConDiseno(diseno: DisenoLienzo): void {
    const nueva: SeccionEditor = {
      tipo: 'LIENZO',
      titulo: diseno.nombre,
      subtitulo: diseno.descripcion ?? null,
      texto: null,
      orden: this.secciones.length,
      visible: true,
      alineacion: 'center',
      estilo: 'contenedor',
      disenoSlug: diseno.slug,
      clave: `lienzo-${Date.now()}`,
    };

    this.secciones = [...this.secciones, nueva];
    this.seccionAbierta.set(nueva.clave);
    this.vista.set('secciones');
    this.cambiosSinGuardar.set(true);
    this.cambiosSinGuardar.set(true);
    this.toast.show(`«${diseno.nombre}» añadido a tu espacio`);
  }

  usarDiseno(seccion: SeccionEspacio, diseno: DisenoLienzo): void {
    seccion.disenoSlug = diseno.slug;
    seccion.tipo = 'LIENZO';
    if (!seccion.titulo || seccion.titulo === 'Nueva sección') seccion.titulo = diseno.nombre;
    this.seccionDiseno.set(null);
    this.cambiosSinGuardar.set(true);
    this.recargarPiezas();
    this.toast.show(`«${diseno.nombre}» se verá en esta sección`);
  }

  recargarPiezas(): void {
    const empresaActual = this.empresaActual;
    if (empresaActual) this.cargarDisenos(empresaActual.id);
  }

  irADisenos(): void {
    void this.router.navigateByUrl('/app/empresa/disenos');
  }

  private claveActual(seccion: SeccionEspacio): string {
    const indice = this.secciones.findIndex((item) => item === seccion);
    return this.secciones[indice]?.clave ?? '';
  }

  private cargarDisenos(empresaId: string): void {
    this.empresa.listarDisenos(empresaId).subscribe((lista) => {
      this.disenos.set(lista ?? []);
      this.cargarPiezasDeDisenos(empresaId, lista ?? []);
    });
  }

  private cargarPiezasDeDisenos(empresaId: string, lista: DisenoLienzo[]): void {
    if (!lista.length) return;

    const faltantes = lista.filter((diseno) => !diseno.piezas || !diseno.piezas.length);
    const objetivo = faltantes.length ? faltantes : lista;

    let pendientes = objetivo.length;
    const mapa = new Map<string, ComponenteLienzo[]>();

    for (const diseno of objetivo) {
      this.empresa.piezasDiseno(empresaId, diseno.id).subscribe((piezas) => {
        mapa.set(diseno.slug, piezas ?? []);
        pendientes -= 1;

        if (pendientes === 0) {
          this.disenos.update((actuales) =>
            actuales.map((item) => ({ ...item, piezas: mapa.get(item.slug) ?? item.piezas ?? [] })),
          );
        }
      });
    }
  }

  get publicado(): boolean {
    return Boolean(this.form.publicado);
  }

  get nombreEmpresa(): string {
    return this.empresa.empresaActual()?.nombre ?? this.form.nombre ?? 'Mi empresa';
  }

  zonaDe(seccion: SeccionEspacio): string {
    return (seccion.estilo && seccion.estilo.trim()) || 'contenedor';
  }

  anclaDeSeccion(seccion: SeccionEspacio): string {
    return anclaSeccion(seccion);
  }

  estilosDe(seccion: SeccionEspacio): Record<string, string> {
    const zona = this.zonaDe(seccion);
    const alineacion = seccion.alineacion ?? 'left';
    const base: Record<string, string> = { 'text-align': alineacion };

    switch (zona) {
      case 'completo':
        return { ...base, width: '100%' };
      case 'mitad':
        return { ...base, width: '50%', 'margin-left': alineacion === 'right' ? 'auto' : '0' };
      case 'izquierda':
        return { ...base, width: 'min(100%, 520px)', 'margin-right': 'auto' };
      case 'derecha':
        return { ...base, width: 'min(100%, 520px)', 'margin-left': 'auto' };
      default:
        return { ...base, width: 'min(100%, 860px)', 'margin-left': 'auto', 'margin-right': 'auto' };
    }
  }

  elegirAlineacion(seccion: SeccionEspacio, valor: string): void {
    seccion.alineacion = valor as SeccionEspacio['alineacion'];
  }

  elegirZona(seccion: SeccionEspacio, zona: string): void {
    seccion.estilo = zona;
  }

  cambiarVisibilidad(publico: boolean): void {
    if (this.publicado === publico) return;

    this.form.publicado = publico;

    if (this.actual()) {
      this.publicar(publico);
      return;
    }

    this.toast.show(
      publico
        ? 'Guarda el espacio para que sea público'
        : 'El espacio se guardará como privado',
    );
  }

  activarAlternancia(zona: string): void {
    this.cambiando.set(true);

    setTimeout(() => {
      this.cambiando.set(false);
      this.toast.show(
        zona === 'publicado'
          ? 'Tu espacio ya es público: cualquiera con el enlace puede verlo'
          : 'Tu espacio ahora es privado: solo lo ves tú y tu equipo',
      );
    }, 160);
  }

  get espacioVista(): EspacioEmpresa {
    const base = this.actual();
    const empresaActual = this.empresaActual;

    return {
      id: base?.id ?? 'nuevo',
      empresaId: base?.empresaId ?? (empresaActual?.id ?? ''),
      empresaNombre: empresaActual?.nombre ?? base?.empresaNombre ?? 'Mi empresa',
      empresaSlug: this.slugEmpresa || base?.empresaSlug || '',
      nombre: this.form.nombre || 'Mi espacio',
      slug: this.form.slug || 'mi-espacio',
      esPrincipal: Boolean(this.form.esPrincipal),
      publicado: Boolean(this.form.publicado),
      estilo: (this.form.estilo as EspacioEmpresa['estilo']) ?? 'CLASICO',
      mostrarIdentidad: this.form.mostrarIdentidad !== false,
      lema: this.form.lema ?? null,
      portadaUrl: this.form.portadaUrl ?? null,
      logoUrl: this.form.logoUrl ?? empresaActual?.logoUrl ?? null,
      colorPrincipal: this.form.colorPrincipal ?? null,
      colorSecundario: this.form.colorSecundario ?? null,
      pie: this.form.pie ?? null,
      navbar: this.navbar.filter((enlace) => enlace.visible !== false),
      secciones: this.secciones
        .filter((seccion) => seccion.visible)
        .map((seccion, indice) => ({ ...seccion, orden: indice })),
      actualizadoEn: base?.actualizadoEn ?? null,
      disenoSlug: this.form.disenoSlug ?? null,
    };
  }

  abrir(espacio: EspacioEmpresa): void {
    this.actual.set(espacio);
    this.form = {
      nombre: espacio.nombre,
      slug: espacio.slug,
      esPrincipal: espacio.esPrincipal,
      publicado: espacio.publicado,
      estilo: espacio.estilo,
      mostrarIdentidad: espacio.mostrarIdentidad !== false,
      lema: espacio.lema ?? '',
      portadaUrl: espacio.portadaUrl ?? '',
      logoUrl: espacio.logoUrl ?? '',
      colorPrincipal: espacio.colorPrincipal ?? '',
      colorSecundario: espacio.colorSecundario ?? '',
      pie: espacio.pie ?? '',
      disenoSlug: espacio.disenoSlug ?? '',
    };

    this.secciones = (espacio.secciones ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((seccion, indice) => ({ ...seccion, orden: indice, clave: this.claveSeccion(seccion, indice) }));

    this.navbar = (espacio.navbar ?? []).map((enlace) => ({ ...enlace }));

    this.piezas.set([]);
    this.cargarPiezas(espacio);
    this.aplicarColores();
  }

  prepararNuevo(): void {
    this.actual.set(null);
    this.form = {
      nombre: 'Mi espacio',
      slug: 'mi-espacio',
      esPrincipal: this.espacios().length === 0,
      publicado: false,
      estilo: 'CLASICO',
      mostrarIdentidad: true,
      lema: 'Una página propia dentro de N-soft',
      portadaUrl: this.portadaInicial,
      logoUrl: this.logoInicial,
      colorPrincipal: '',
      colorSecundario: '',
      pie: '',
      disenoSlug: '',
    };

    this.secciones = seccionesIniciales().map((seccion, indice) => ({
      ...seccion,
      clave: this.claveSeccion(seccion, indice),
    }));
    this.navbar = navbarInicial(this.secciones);

    this.piezas.set([]);
    this.vista.set('estructura');
  }

  seleccionarPorId(evento: Event): void {
    const id = (evento.target as HTMLSelectElement).value;
    const elegido = this.espacios().find((espacio) => espacio.id === id);
    if (elegido) this.abrir(elegido);
  }

  seleccionarEspacio(espacio: EspacioEmpresa): void {
    if (!this.guardando()) this.abrir(espacio);
  }

  cambiarVista(vista: VistaEditor): void {
    this.vista.set(vista);
  }

  normalizarSlug(): void {
    this.form.slug = slugLibre(this.form.slug || this.form.nombre || '', 'mi-espacio');
  }

  moverSeccion(indice: number, direccion: -1 | 1): void {
    const destino = indice + direccion;
    if (destino < 0 || destino >= this.secciones.length) return;

    const copia = [...this.secciones];
    const [movida] = copia.splice(indice, 1);
    copia.splice(destino, 0, movida);
    this.secciones = copia.map((seccion, posicion) => ({ ...seccion, orden: posicion }));
    this.cambiosSinGuardar.set(true);
  }

  alternarSeccion(indice: number): void {
    this.secciones = this.secciones.map((seccion, posicion) =>
      posicion === indice ? { ...seccion, visible: !seccion.visible } : seccion,
    );
    this.cambiosSinGuardar.set(true);
  }

  quitarSeccion(indice: number): void {
    this.secciones = this.secciones
      .filter((_, posicion) => posicion !== indice)
      .map((seccion, posicion) => ({ ...seccion, orden: posicion }));
    this.cambiosSinGuardar.set(true);
  }

  marcarCambios(): void {
    this.cambiosSinGuardar.set(true);
  }

  agregarSeccion(tipo: TipoSeccionEspacio): void {
    const descripcion = CATALOGO_SECCIONES.find((item) => item.tipo === tipo);
    const nueva: SeccionEditor = {
      tipo,
      titulo: descripcion?.etiqueta ?? 'Nueva sección',
      subtitulo: null,
      texto: null,
      orden: this.secciones.length,
      visible: true,
      alineacion: 'left',
      estilo: null,
      clave: `${tipo.toLowerCase()}-${Date.now()}`,
    };

    this.secciones = [...this.secciones, nueva];
    this.seccionAbierta.set(nueva.clave);
    this.vista.set('secciones');
    this.cambiosSinGuardar.set(true);
  }

  agregarSeleccionada(): void {
    this.agregarSeccion(this.nuevaSeccion());
  }

  editarSeccion(clave: string): void {
    this.seccionAbierta.update((actual) => (actual === clave ? null : clave));
  }

  agregarEnlace(): void {
    this.navbar = [
      ...this.navbar,
      { etiqueta: 'Nuevo enlace', tipo: 'ANCLA', destino: '', icono: null, visible: true },
    ];
  }

  quitarEnlace(indice: number): void {
    this.navbar = this.navbar.filter((_, posicion) => posicion !== indice);
  }

  moverEnlace(indice: number, direccion: -1 | 1): void {
    const destino = indice + direccion;
    if (destino < 0 || destino >= this.navbar.length) return;

    const copia = [...this.navbar];
    const [movido] = copia.splice(indice, 1);
    copia.splice(destino, 0, movido);
    this.navbar = copia;
  }

  anclasDisponibles(): { valor: string; etiqueta: string }[] {
    return [
      { valor: '', etiqueta: 'Sin acción (no hace nada)' },
      { valor: '#inicio', etiqueta: 'Inicio (portada)' },
      ...this.secciones.map((seccion) => ({
        valor: `#${anclaSeccion(seccion)}`,
        etiqueta: seccion.titulo || etiquetaSeccion(seccion.tipo),
      })),
      { valor: '#contacto', etiqueta: 'Contacto (cierre)' },
    ];
  }

  anclasRotas(): string[] {
    const validas = new Set(this.anclasDisponibles().map((ancla) => ancla.valor).filter(Boolean));

    return this.navbar
      .filter((enlace) => enlace.tipo === 'ANCLA' && enlace.destino && !validas.has(enlace.destino))
      .map((enlace) => enlace.etiqueta);
  }

  etiquetaDe(tipo: TipoSeccionEspacio): string {
    return etiquetaSeccion(tipo);
  }

  iconoDe(tipo: TipoSeccionEspacio): string {
    return iconoSeccion(tipo);
  }

  guardar(): void {
    const empresaActual = this.empresaActual;
    if (!empresaActual || this.guardando()) return;

    this.normalizarSlug();

    if (!this.form.nombre?.trim()) {
      this.toast.show('El espacio necesita un nombre.');
      return;
    }

    const avisoImagen = this.imagenDemasiadoGrande();
    if (avisoImagen) {
      this.toast.show(avisoImagen);
      return;
    }

    const payload: EspacioForm = {
      ...this.form,
      mostrarIdentidad: this.form.mostrarIdentidad !== false,
      navbar: this.navbar,
      secciones: this.secciones.map((seccion, indice) => ({
        id: seccion.id ?? null,
        tipo: seccion.tipo,
        titulo: seccion.titulo ?? null,
        subtitulo: seccion.subtitulo ?? null,
        texto: seccion.texto ?? null,
        orden: indice,
        visible: seccion.visible,
        alineacion: seccion.alineacion ?? 'left',
        estilo: seccion.estilo ?? null,
        disenoSlug: seccion.disenoSlug ?? null,
      })),
    };

    this.guardando.set(true);
    const peticion = this.actual()
      ? this.empresa.actualizarEspacio(empresaActual.id, this.actual()!.id, payload)
      : this.empresa.crearEspacio(empresaActual.id, payload);

    peticion.subscribe({
      next: (espacio) => {
        this.guardando.set(false);
        this.actual.set(espacio);
        this.espacios.update((lista) => {
          const existe = lista.some((item) => item.id === espacio.id);
          return existe ? lista.map((item) => (item.id === espacio.id ? espacio : item)) : [...lista, espacio];
        });
        this.cambiosSinGuardar.set(false);
        this.toast.show('Espacio guardado');
      },
      error: () => {
        this.guardando.set(false);
        this.toast.show('No se pudo guardar el espacio. Revisa el enlace y los permisos.');
      },
    });
  }

  publicar(publicado: boolean): void {
    const empresaActual = this.empresaActual;
    const espacio = this.actual();
    if (!empresaActual || !espacio) {
      this.toast.show('Guarda el espacio antes de publicarlo.');
      return;
    }

    this.empresa.publicarEspacio(empresaActual.id, espacio.id, publicado).subscribe({
      next: (actualizado) => {
        this.form.publicado = actualizado.publicado;
        this.actual.set(actualizado);
        this.espacios.update((lista) => lista.map((item) => (item.id === actualizado.id ? actualizado : item)));
        this.toast.show(actualizado.publicado ? 'Espacio publicado' : 'Espacio en borrador');
      },
      error: () => this.toast.show('No se pudo cambiar la publicación.'),
    });
  }

  crearOtro(): void {
    this.prepararNuevo();
    this.vista.set('estructura');
  }

  copiarEnlace(): void {
    const url = this.urlPublica;

    if (isPlatformBrowser(this.plataforma) && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}${url}`).then(
        () => this.toast.show('Enlace copiado'),
        () => this.toast.show(url),
      );
      return;
    }

    this.toast.show(url);
  }

  private cargarEspacios(empresaId: string): void {
    this.empresa.espacios(empresaId).subscribe((lista) => {
      this.espacios.set(lista);
      this.cargando.set(false);

      if (!lista.length) {
        this.prepararNuevo();
        this.cargarDisenos(empresaId);
        return;
      }

      const preferido = this.route.snapshot.queryParamMap.get('espacio');
      const elegido = preferido ? lista.find((espacio) => espacio.slug === preferido) : undefined;
      this.abrir(elegido ?? lista[0]);
      this.cargarDisenos(empresaId);
    });
  }

  private claveSeccion(seccion: SeccionEspacio, indice: number): string {
    return seccion.id ?? `${seccion.tipo.toLowerCase()}-${indice}`;
  }

  private cargarPiezas(espacio: EspacioEmpresa): void {
    if (!espacio.disenoSlug) return;

    this.empresa.disenoPrivado(espacio.disenoSlug).subscribe((diseno) => {
      if (!diseno) return;
      this.piezas.set(
        [...(diseno.piezas ?? [])]
          .filter((pieza) => pieza.visible)
          .sort((a, b) => (a.detras === b.detras ? a.capa - b.capa : a.detras ? -1 : 1)),
      );
    });
  }

  /** Color de texto de la portada; "auto" deja que se elija según la imagen. */
  readonly colorTextoAuto = signal(true);
  readonly colorTextoValor = signal('#ffffff');

  colorTexto(): string {
    return this.colorTextoAuto() ? this.colorTextoValor() : this.colorTextoValor();
  }

  cambiarColorTexto(valor: string): void {
    if (!valor) return;
    this.colorTextoAuto.set(false);
    this.colorTextoValor.set(valor);
    this.cambiosSinGuardar.set(true);
    this.aplicarColores();
  }

  colorTextoAutomatico(): void {
    this.colorTextoAuto.set(true);
    this.cambiosSinGuardar.set(true);
    this.aplicarColores();
  }

  /** Lleva a los ajustes donde se edita la identidad (nombre, lema, logo, portada). */
  irAIdentidad(): void {
    this.vista.set('estructura');
    if (typeof document === 'undefined') return;

    setTimeout(() => {
      document.getElementById('identidad-espacio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  /** Deja la portada (la identidad del espacio) visible u oculta en la landing. */
  alternarIdentidad(): void {
    this.form.mostrarIdentidad = this.form.mostrarIdentidad === false;
    this.cambiosSinGuardar.set(true);
  }

  /** Cambia un color y lo refleja en la vista previa al momento. */
  cambiarColor(campo: 'colorPrincipal' | 'colorSecundario', valor: string): void {
    this.form[campo] = valor;
    this.cambiosSinGuardar.set(true);
    this.aplicarColores();
  }

  /** Antes de guardar, avisa si una imagen es tan grande que el servidor la rechazaría. */
  private imagenDemasiadoGrande(): string | null {
    const limite = 6_000_000;
    const portada = (this.form.portadaUrl ?? '').length;
    const logo = (this.form.logoUrl ?? '').length;

    if (portada > limite) return 'La portada pesa demasiado. Usa una imagen de menos de 4 MB.';
    if (logo > limite) return 'El logo pesa demasiado. Usa una imagen de menos de 4 MB.';
    return null;
  }

  private aplicarColores(): void {
    const texto = this.colorTextoAuto() ? null : this.colorTextoValor();

    this.diseno.aplicarAjeno({
      acento: this.form.colorPrincipal || null,
      secundario: this.form.colorSecundario || null,
      fondoUrl: null,
      css: texto ? `.hero__contenido, .hero h1, .hero__lema, .hero__sello { color: ${texto} !important; }` : null,
      activo: Boolean(this.form.colorPrincipal || this.form.colorSecundario || texto),
    });
  }
}

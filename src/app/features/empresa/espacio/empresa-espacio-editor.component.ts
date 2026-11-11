import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
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
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';
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
  private plataforma = inject(PLATFORM_ID);

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
  readonly zonas = ZONAS;
  readonly alineaciones = ALINEACIONES;
  readonly cambiando = signal(false);

  form: EspacioForm = {};
  navbar: EnlaceEspacio[] = [];
  secciones: SeccionEditor[] = [];
  piezas = signal<import('../../../core/models/empresa.model').ComponenteLienzo[]>([]);

  ngOnInit(): void {
    this.empresa.cargarMis().subscribe((mias) => {
      if (!mias.length) {
        this.cargando.set(false);
        return;
      }

      const activa = this.empresa.activaId() ?? mias[0].id;
      if (!this.empresa.activaId()) this.empresa.entrar(activa);

      this.empresa.espacios(activa).subscribe((lista) => {
        this.espacios.set(lista);
        this.cargando.set(false);

        if (lista.length) {
          this.abrir(lista[0]);
        } else {
          this.prepararNuevo();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.diseno.limpiarAjeno();
  }

  get empresaActual() {
    return this.empresa.empresaActual();
  }

  get slugEmpresa(): string {
    return this.empresaActual?.slug ?? '';
  }

  get espacioSlug(): string {
    return this.form.slug ?? '';
  }

  get puedeEditar(): boolean {
    return Boolean(this.empresa.acceso()?.editaPerfil || this.empresa.acceso()?.editaLienzo);
  }

  get urlPublica(): string {
    return urlEspacio(this.slugEmpresa, this.espacioSlug);
  }

  get esNuevo(): boolean {
    return !this.actual();
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
      lema: espacio.lema ?? '',
      portadaUrl: espacio.portadaUrl ?? '',
      logoUrl: espacio.logoUrl ?? '',
      colorPrincipal: espacio.colorPrincipal ?? '',
      colorSecundario: espacio.colorSecundario ?? '',
      pie: espacio.pie ?? '',
      disenoSlug: espacio.disenoSlug ?? '',
    };

    this.navbar = espacio.navbar?.length
      ? espacio.navbar.map((enlace) => ({ ...enlace }))
      : navbarInicial();

    this.secciones = (espacio.secciones?.length ? espacio.secciones : seccionesIniciales())
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((seccion, indice) => ({ ...seccion, orden: indice, clave: this.claveSeccion(seccion, indice) }));

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
      lema: 'Una página propia dentro de N-soft',
      portadaUrl: '',
      logoUrl: '',
      colorPrincipal: '',
      colorSecundario: '',
      pie: '',
      disenoSlug: '',
    };

    this.navbar = navbarInicial();
    this.secciones = seccionesIniciales().map((seccion, indice) => ({
      ...seccion,
      clave: this.claveSeccion(seccion, indice),
    }));

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
  }

  alternarSeccion(indice: number): void {
    this.secciones = this.secciones.map((seccion, posicion) =>
      posicion === indice ? { ...seccion, visible: !seccion.visible } : seccion,
    );
  }

  quitarSeccion(indice: number): void {
    this.secciones = this.secciones
      .filter((_, posicion) => posicion !== indice)
      .map((seccion, posicion) => ({ ...seccion, orden: posicion }));
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
      { etiqueta: 'Nuevo enlace', tipo: 'ANCLA', destino: '#inicio', icono: null, visible: true },
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
      { valor: '#inicio', etiqueta: 'Inicio (portada)' },
      ...this.secciones.map((seccion) => ({
        valor: `#${anclaSeccion(seccion)}`,
        etiqueta: seccion.titulo || etiquetaSeccion(seccion.tipo),
      })),
    ];
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

    const payload: EspacioForm = {
      ...this.form,
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

  private aplicarColores(): void {
    this.diseno.aplicarAjeno({
      acento: this.form.colorPrincipal || null,
      secundario: this.form.colorSecundario || null,
      fondoUrl: null,
      css: null,
      activo: Boolean(this.form.colorPrincipal || this.form.colorSecundario),
    });
  }
}

import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { RailStateService } from '../../../core/services/rail-state.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { TourService } from '../../../core/services/tour.service';
import { ConfirmationModalService } from '../../../core/services/confirmation-modal.service';
import { Empresa } from '../../../core/models/empresa.model';
import { LogoComponent } from '../../../shared/components/logo/logo.component';
import { SpotifyWidgetComponent } from '../../../shared/components/spotify-widget/spotify-widget.component';
import { YouTubeWidgetComponent } from '../../../shared/components/youtube-widget/youtube-widget.component';
import { esSinImagen } from '../../../features/empresa/espacio/espacio-ui';

interface RailItem {
  label: string;
  icon: string;
  ruta?: string;
  exacto?: boolean;
  accion?: 'mensajes' | 'salir' | 'ajustes' | 'grupo' | 'guia';
  nota?: string;
  /** 'cv' = Hoja de vida + Portafolio + Enlaces; 'equipo' = Enlaces + Tarjetas del equipo. */
  grupo?: 'cv' | 'equipo';
  /** Entradas desplegables dentro de una fila del riel (el panel). */
  hijos?: RailItem[];
}

/**
 * Navegación personal, estilo Instagram: el perfil NO es una fila más.
 * Se entra al perfil desde la tarjeta del pie del riel o desde el menú "Más".
 */
const NAVEGACION_PERSONAL: RailItem[] = [
  { label: 'Inicio', icon: 'fa-solid fa-house', ruta: '/app', exacto: true },
  { label: 'Mapa de conexiones', icon: 'fa-solid fa-map-location-dot', ruta: '/app/ubicacion' },
  { label: 'Talento', icon: 'fa-solid fa-magnifying-glass', ruta: '/app/talento' },
  { label: 'Portafolio', icon: 'fa-solid fa-briefcase', accion: 'grupo', grupo: 'cv', nota: 'Tus trabajos y enlaces' },
  { label: 'Proyectos', icon: 'fa-solid fa-diagram-project', ruta: '/app/proyectos' },
];

/** Lo que vive en "Más": nada de esto se pierde, solo se pliega. */
const MENU_MAS: RailItem[] = [
  { label: 'Mi panel', icon: 'fa-solid fa-chart-pie', ruta: '/app/panel' },
  { label: 'Hoja de vida', icon: 'fa-solid fa-file-lines', ruta: '/app/informacion-personal' },
  { label: 'Buscar empleo', icon: 'fa-solid fa-briefcase', ruta: '/app/empleo' },
  { label: 'Emitir por NFC', icon: 'fa-solid fa-tower-broadcast', ruta: '/app/emisora' },
  { label: '¿Cómo funciona la app?', icon: 'fa-solid fa-circle-question', accion: 'guia' },
];

const NAVEGACION_EMPRESA: RailItem[] = [
  { label: 'Perfil en la red', icon: 'fa-solid fa-building', ruta: '/app/empresa', exacto: true, nota: 'Lo que ven los demás' },
  { label: 'Mi espacio', icon: 'fa-solid fa-globe', ruta: '/app/empresa/espacio', nota: 'Tu landing' },
  { label: 'Diseño', icon: 'fa-solid fa-pen-ruler', ruta: '/app/empresa/lienzo', nota: 'Armar secciones' },
  { label: 'Mis diseños', icon: 'fa-solid fa-folder-open', ruta: '/app/empresa/disenos', nota: 'Componentes' },
  {
    label: 'Panel de la empresa',
    icon: 'fa-solid fa-chart-pie',
    ruta: '/app/panel',
    hijos: [],
  },
  { label: 'Punto de venta', icon: 'fa-solid fa-cash-register', ruta: '/app/empresa/pos', nota: 'Ventas y catálogo' },
  { label: 'Equipo', icon: 'fa-solid fa-users', ruta: '/app/empresa/ajustes?tab=equipo' },
  { label: 'Enlaces', icon: 'fa-solid fa-link', accion: 'grupo', grupo: 'equipo', nota: 'Enlaces y tarjetas del equipo' },
];

/** Hijos del desplegable de cada grupo. */
const GRUPOS: Record<'cv' | 'equipo', RailItem[]> = {
  cv: [
    { label: 'Portafolio', icon: 'fa-solid fa-briefcase', ruta: '/app/portafolio', nota: 'Tus trabajos' },
    { label: 'Mis enlaces', icon: 'fa-solid fa-link', ruta: '/app/hub', nota: 'Todo en un link' },
  ],
  equipo: [
    { label: 'Enlaces del equipo', icon: 'fa-solid fa-link', ruta: '/app/empresa/enlaces', nota: 'Links de cada uno' },
    { label: 'Tarjetas del equipo', icon: 'fa-solid fa-address-card', ruta: '/app/empresa/tarjetas', nota: 'vCards para compartir' },
  ],
};

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LogoComponent, SpotifyWidgetComponent, YouTubeWidgetComponent],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
})
export class SideNavComponent {
  private auth = inject(AuthService);
  private destruir = inject(DestroyRef);
  private perfiles = inject(UserProfileService);
  readonly router = inject(Router);

  /** Qué fila del riel está desplegada (por ahora solo el panel). */
  readonly rielAbierto = signal<string | null>(null);
  readonly mensajes = inject(SidePanelService);
  readonly rail = inject(RailStateService);
  readonly empresa = inject(EmpresaService);
  private tour = inject(TourService);
  private confirmation = inject(ConfirmationModalService);
  private readonly documento = inject(DOCUMENT);

  readonly user = this.auth.currentUser;
  readonly avatar = this.perfiles.avatar;

  private readonly quitarOyentes: (() => void)[] = [];

  constructor() {
    this.empresa.cargarMis().pipe(takeUntilDestroyed(this.destruir)).subscribe();
    this.escucharClicFuera();
    this.destruir.onDestroy(() => this.quitarOyentes.splice(0).forEach((quitar) => quitar()));

    // Escribe una señal dentro del effect: en Angular 17 eso exige allowSignalWrites (si no, NG0600).
    effect(() => {
      this.empresa.enModoEmpresa();
      this.espaciosAbiertos.set(false);
    }, { allowSignalWrites: true });
  }

  /**
   * Las tres vistas del panel: tus estadísticas en la red social, las de la empresa
   * y tu aporte dentro de la empresa. Cada una abre su propia gráfica.
   */
  readonly modosPanel: RailItem[] = [
    {
      label: 'En la red social',
      icon: 'fa-solid fa-user',
      ruta: '/app/panel',
      nota: 'Tus estadísticas en la red social',
    },
    {
      label: 'De la empresa',
      icon: 'fa-solid fa-building',
      ruta: '/app/panel',
      nota: 'Las estadísticas de toda la empresa',
    },
    {
      label: 'Mi aporte',
      icon: 'fa-solid fa-user-tie',
      ruta: '/app/panel',
      nota: 'Lo que aportas dentro de la empresa',
    },
  ];

  get navegacion(): RailItem[] {
    const base = this.empresa.enModoEmpresa() ? NAVEGACION_EMPRESA : NAVEGACION_PERSONAL;

    // El panel siempre lleva sus tres vistas colgando.
    return base.map((item) =>
      item.ruta === '/app/panel'
        ? {
            ...item,
            label: this.empresa.enModoEmpresa() ? 'Panel de la empresa' : 'Mi panel',
            hijos: this.modosPanel,
          }
        : item
    );
  }

  /** Abre o cierra el desplegable de una fila del riel. */
  alternarRiel(label: string): void {
    this.rielAbierto.update((actual) => (actual === label ? null : label));
  }

  /** Los modos de los hijos del panel, en orden: red, empresa, mi aporte. */
  modoDe(indice: number): string {
    return ['red', 'empresa', 'mi-aporte'][indice] ?? 'red';
  }

  /** El modo del panel que está activo, según la URL. */
  modoActivo(): string | null {
    const modo = this.router.url.split('?')[1]?.match(/(?:^|&)modo=([^&]+)/)?.[1] ?? 'red';
    return modo;
  }

  get salida(): RailItem[] {
    if (this.empresa.enModoEmpresa()) {
      return [{ label: 'Ajustes de la empresa', icon: 'fa-solid fa-gear', accion: 'ajustes' }];
    }
    return [{ label: 'Ajustes de cuenta', icon: 'fa-solid fa-gear', accion: 'ajustes' }];
  }

  get tituloAjustes(): string {
    return this.empresa.enModoEmpresa() ? 'Ajustes de la empresa' : 'Ajustes de cuenta';
  }

  get subtituloAjustes(): string {
    return this.empresa.enModoEmpresa()
      ? 'Perfil, equipo y permisos de la empresa'
      : 'Tus datos personales, privacidad y seguridad';
  }

  get enEmpresa(): boolean {
    return this.empresa.enModoEmpresa();
  }

  abrirAjustes(): void {
    const destino = this.empresa.enModoEmpresa() ? '/app/empresa/ajustes' : '/app/ajustes/cuenta';
    void this.router.navigateByUrl(destino);
  }

  get tituloCuenta(): string {
    return this.empresa.enModoEmpresa()
      ? (this.empresa.empresaActual()?.nombre ?? 'Mi empresa')
      : (this.user()?.fullName ?? 'Mi perfil');
  }

  get subtituloCuenta(): string {
    if (this.empresa.enModoEmpresa()) {
      return this.empresa.empresaActual()?.rolEtiqueta ?? 'Modo empresa';
    }
    return this.subtitulo();
  }

  get logotipoEmpresa(): string | null {
    return this.empresa.empresaActual()?.logoUrl ?? null;
  }

  /** Foto de la cuenta que se está usando: logo de la empresa o foto del perfil personal. */
  get fotoCuenta(): string | null {
    if (this.empresa.enModoEmpresa()) return this.logotipoEmpresa;
    return this.avatar();
  }

  /** Oculta la imagen rota para que queden las iniciales en su lugar. */
  fotoCuentaFallida(evento: Event): void {
    const img = evento.target as HTMLImageElement | null;
    if (img) {
      img.style.display = 'none';
      img.parentElement?.classList.add('sin-foto');
    }
  }

  inicialesDe(nombre: string): string {
    const limpio = (nombre ?? '').trim();
    if (!limpio) return 'U';
    const partes = limpio.split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  /** Logo del espacio: si el usuario lo quitó, se muestran las iniciales. */
  logoDe(espacio: { logoUrl?: string | null } | null): string | null {
    const valor = (espacio?.logoUrl ?? '').trim();
    if (!valor || esSinImagen(valor)) return null;
    return valor;
  }

  readonly espaciosAbiertos = signal(false);

  /** Panel "Más" abierto (las opciones que no caben en el riel). */
  readonly masAbierto = signal(false);

  alternarMas(): void {
    this.masAbierto.update((v) => !v);
  }

  cerrarMas(): void {
    this.masAbierto.set(false);
  }

  /** Grupo desplegado en la barra lateral ('cv' o 'equipo'). */
  readonly grupoAbierto = signal<'cv' | 'equipo' | null>(null);

  hijos(grupo: 'cv' | 'equipo'): RailItem[] {
    return GRUPOS[grupo];
  }

  /** Al entrar en una hoja el grupo se cierra: el resaltado no se queda pegado. */
  cerrarGrupo(): void {
    this.grupoAbierto.set(null);
  }

  alternarGrupo(grupo: 'cv' | 'equipo'): void {
    this.grupoAbierto.update((actual) => (actual === grupo ? null : grupo));
    this.espaciosAbiertos.set(false);
  }

  /** Hay un grupo abierto: el riel no se puede colapsar o el desplegable se perdería. */
  get hayGrupo(): boolean {
    return this.grupoAbierto() !== null;
  }

  get misEmpresas(): Empresa[] {
    const activa = this.empresa.empresaActual();
    if (activa && !this.empresa.listado().some((empresa) => empresa.id === activa.id)) {
      return [activa, ...this.empresa.listado()];
    }
    return this.empresa.listado();
  }

  get misEspacios(): { id: string; nombre: string; rol: string; logoUrl?: string | null }[] {
    return this.misEmpresas.map((empresa) => ({
      id: empresa.id,
      nombre: empresa.nombre,
      rol: empresa.rolEtiqueta ?? 'Miembro',
      logoUrl: empresa.logoUrl ?? null,
    }));
  }

  get espacioActual(): { id: string; nombre: string; rol: string; logoUrl?: string | null } | null {
    const activa = this.empresa.empresaActual();
    if (!activa) return null;
    return {
      id: activa.id,
      nombre: activa.nombre,
      rol: activa.rolEtiqueta ?? 'Miembro',
      logoUrl: activa.logoUrl ?? null,
    };
  }

  get hayEspacios(): boolean {
    return this.misEmpresas.length > 0;
  }

  alternarEspacios(): void {
    this.espaciosAbiertos.update((valor) => !valor);
    this.grupoAbierto.set(null);
    if (this.espaciosAbiertos()) {
      this.empresa.cargarMis(true).subscribe();
    }
  }

  /** Cierra el menú de espacios al pulsar en cualquier sitio que no sea el panel o su botón. */
  private escucharClicFuera(): void {
    const escuchar = (evento: Event) => {
      if (!this.espaciosAbiertos() && !this.grupoAbierto()) return;
      const destino = evento.target as HTMLElement | null;
      if (destino?.closest('.rail__cambiar-caja') || destino?.closest('.rail__grupo')) return;
      this.espaciosAbiertos.set(false);
      this.grupoAbierto.set(null);
    };

    const conEscape = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      this.espaciosAbiertos.set(false);
      this.grupoAbierto.set(null);
    };

    this.documento.addEventListener('pointerdown', escuchar, true);
    this.documento.addEventListener('keydown', conEscape);
    this.quitarOyentes.push(() => {
      this.documento.removeEventListener('pointerdown', escuchar, true);
      this.documento.removeEventListener('keydown', conEscape);
    });
  }

  irAEspacio(id: string): void {
    this.espaciosAbiertos.set(false);
    this.grupoAbierto.set(null);
    this.empresa.entrar(id);
    void this.router.navigateByUrl('/app/empresa').then(() => this.documento.defaultView?.scrollTo({ top: 0 }));
  }

  irAPersonal(): void {
    this.espaciosAbiertos.set(false);
    this.grupoAbierto.set(null);
    this.empresa.salir();
    void this.router.navigateByUrl('/app/perfil');
  }

  /** Botón de la barra inferior (móvil): cambia entre personal y empresa. */
  alternarCuenta(): void {
    if (this.empresa.enModoEmpresa()) {
      this.irAPersonal();
      return;
    }
    const primera = this.misEmpresas[0];
    if (primera) {
      this.irAEspacio(primera.id);
    } else {
      void this.router.navigateByUrl('/app/empresa');
    }
  }

  irAperfilPersonal(): void {
    this.espaciosAbiertos.set(false);
    void this.router.navigateByUrl('/app/perfil');
  }

  iniciales(): string {
    if (this.empresa.enModoEmpresa()) {
      return this.inicialesDe(this.empresa.empresaActual()?.nombre ?? '');
    }
    return this.inicialesDe(this.user()?.fullName ?? '');
  }

  subtitulo(): string {
    const usuario = this.user();
    return usuario?.gitUsername ? `@${usuario.gitUsername}` : (usuario?.email ?? '');
  }

  abrirMensajes(): void {
    this.mensajes.openContacts();
  }

  /** Importar hoja de vida (PDF): abre el panel en la vista de importación. */
  importarCv(): void {
    this.mensajes.openPdf();
  }

  /** Cerrar sesión desde la fila del pie del riel. */
  async cerrarSesion(): Promise<void> {
    const confirmado = await this.confirmation.confirmLogout();
    if (!confirmado) return;
    this.auth.logout();
    void this.router.navigate(['/']);
  }

  /**
   * El riel ya no se abre por hover: se abre con clic. Aquí solo se usa el
   * ratón para cerrar los desplegables cuando salimos de verdad del riel y de
   * sus paneles (si están abiertos, no se toca nada).
   */
  /** Acercar el ratón abre el riel; alejarlo lo devuelve a la miniatura. */
  alEntrarRiel(): void {
    this.rail.expandir();
  }

  /**
   * Al alejar el ratón se pliega el riel, pero los desplegables ("Más" y
   * "Cambiar de espacio") se quedan abiertos: el ratón sale del riel justo
   * cuando vas a pulsar dentro de ellos, y si se cerraran no podrías elegir.
   */
  alSalirRiel(evento: MouseEvent): void {
    const destino = evento.relatedTarget as Node | null;
    if (destino && (evento.currentTarget as HTMLElement)?.contains(destino)) return;

    this.rail.contraer();
  }

  /** Opciones de "Más" (las que no caben en el riel sin hacerlo interminable). */
  get mas(): RailItem[] {
    return MENU_MAS;
  }

  abrirGuia(): void {
    this.masAbierto.set(false);
    this.tour.abrir();
  }
}

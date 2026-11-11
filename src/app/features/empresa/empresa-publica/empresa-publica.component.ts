import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import {
  ComponenteLienzo,
  DisenoLienzo,
  Empresa,
  EmpresaPublica,
  EspacioEmpresa,
  MiembroEmpresa,
  PerfilRedEmpresa,
  PublicacionRed,
} from '../../../core/models/empresa.model';
import { DisenoService } from '../../../core/services/diseno.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import {
  LIENZO_ALTO,
  LIENZO_ANCHO,
  etiquetaOpcion,
  etiquetaTipoEmpresa,
  leerJson,
} from '../empresa-ui';
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';
import { EmpresaRedNavbarComponent } from '../red/empresa-red-navbar.component';
import { LinkItem } from '../../../core/models/LinkItem';
import { LinkHubService } from '../../../core/services/link-hub.service';


@Component({
  selector: 'app-empresa-publica',
  standalone: true,
  imports: [CommonModule, RouterLink, EmpresaComponenteVistaComponent, EmpresaRedNavbarComponent],
  templateUrl: './empresa-publica.component.html',
  styleUrls: ['./empresa-publica.component.scss'],
})
export class EmpresaPublicaComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private servicio = inject(EmpresaService);
  private diseno = inject(DisenoService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private auth = inject(AuthService);
  private panelLateral = inject(SidePanelService);
  private toast = inject(ToastService);
  private linkHub = inject(LinkHubService);

  @ViewChild('marco') marco?: ElementRef<HTMLElement>;

  readonly datos = signal<EmpresaPublica | null>(null);
  readonly cargando = signal(true);
  readonly enlaces = signal<LinkItem[]>([]);
  readonly tab = signal<'inicio' | 'publicaciones' | 'miembros' | 'seguidores' | 'propuestas' | 'informacion' | 'espacios' | 'enlaces' | 'tarjetas'>('inicio');
  readonly espacios = signal<EspacioEmpresa[]>([]);
  readonly siguiendo = signal(false);
  readonly seguidores = signal(0);
  readonly seguidos = signal(0);
  readonly totalSeguidores = signal(0);
  readonly urlLanding = signal<string | null>(null);
  readonly red = signal<PerfilRedEmpresa | null>(null);
  readonly borrador = signal('');
  readonly publicando = signal(false);
  readonly escala = signal(0.5);

  readonly ancho = LIENZO_ANCHO;
  readonly alto = LIENZO_ALTO;

  private observador: ResizeObserver | null = null;
  private ajustar = (): void => this.calcular();
  private recargarRed = (): void => {
    const empresa = this.empresa;
    if (empresa) this.cargarRed(empresa.id);
  };

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug) {
      this.cargando.set(false);
      return;
    }

    this.servicio.cargarPublica(slug).subscribe((datos) => {
      this.cargando.set(false);
      if (!datos) return;

      this.datos.set(datos);
      this.espacios.set(datos.espacios ?? []);
      this.diseno.aplicarAjeno(this.disenoDe(datos));

      this.cargarRed(datos.empresa.id);
      this.cargarLanding(datos.empresa.slug, datos.empresa.id);
      this.cargarEnlaces(datos.empresa.id);

      if (isPlatformBrowser(this.platformId)) {
        this.escucharActualizaciones();

        setTimeout(() => {
          this.observar();
          this.calcular();
        }, 40);
      }
    });
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('empresa-red-actualizar', this.recargarRed);
    }

    this.observador?.disconnect();
    this.observador = null;

    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.ajustar);
    }

    this.diseno.limpiarAjeno();
  }

  get empresa(): Empresa | null {
    return this.datos()?.empresa ?? null;
  }

  get empresaPropia(): Empresa | null {
    const activa = this.servicio.empresaActual();
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!activa || !slug) return null;
    return activa.slug === slug ? activa : null;
  }

  get esMiEmpresa(): boolean {
    return Boolean(this.empresaPropia);
  }

  get componentes(): ComponenteLienzo[] {
    return [...(this.datos()?.componentes ?? [])]
      .filter((componente) => componente.visible)
      .sort((a, b) => {
        if (a.detras !== b.detras) return a.detras ? -1 : 1;
        return a.capa - b.capa;
      });
  }

  /** Piezas con enlace propio que la empresa publicó (sin los fondos decorativos). */
  get piezas(): ComponenteLienzo[] {
    const datos = this.datos();
    if (!datos) return [];
    return (datos.piezas ?? datos.componentes ?? []).filter((componente) => componente.visible);
  }

  /** Diseños públicos de la empresa, cada uno con su enlace propio. */
  get disenos(): DisenoLienzo[] {
    return this.datos()?.disenos ?? [];
  }

  /** La empresa no expone sus lienzos aquí: solo lo público del perfil. */
  get urlComponentes(): string {
    const slug = this.empresa?.slug;
    return slug ? `/empresa/${slug}/componentes` : '/empresa';
  }

  enlacePieza(componente: ComponenteLienzo): string {
    return componente.enlace ?? this.urlComponentes;
  }

  nombrePieza(componente: ComponenteLienzo): string {
    const contenido = leerJson<any>(componente.contenido, {});
    return String(contenido?.titulo ?? contenido?.nombre ?? componente.nombre ?? this.etiquetaPieza(componente.tipo));
  }

  etiquetaPieza(tipo: string): string {
    switch (tipo) {
      case 'MENU':
        return 'Menú';
      case 'BOTON':
      case 'CONTACTO':
      case 'PRODUCTO':
        return 'Tarjeta';
      case 'HTML':
        return 'Interactiva';
      case 'TEXTO':
        return 'Información';
      case 'LISTA':
        return 'Lista';
      case 'GALERIA':
        return 'Galería';
      case 'HORARIO':
        return 'Horario';
      default:
        return 'Pieza';
    }
  }

  get equipo(): MiembroEmpresa[] {
    return (this.datos()?.equipo ?? []).filter((miembro) => miembro.visibleEnEquipo);
  }

  get tipoEmpresa(): string {
    const empresa = this.empresa;
    return etiquetaOpcion(this.servicio.catalogo(), 'tipos', empresa?.tipo) || etiquetaTipoEmpresa(empresa);
  }

  get sectorEmpresa(): string {
    return etiquetaOpcion(this.servicio.catalogo(), 'sectores', this.empresa?.sector);
  }

  get ubicacion(): string {
    const empresa = this.empresa;
    if (!empresa) return '';
    return [empresa.ciudad, empresa.departamento].filter((valor) => Boolean(valor)).join(', ');
  }

  get whatsappUrl(): string {
    const limpio = (this.empresa?.whatsapp ?? '').replace(/[^\d]/g, '');
    return limpio ? `https://wa.me/${limpio}` : '';
  }

  get correoUrl(): string {
    const correo = this.empresa?.correo;
    return correo ? `mailto:${correo}` : '';
  }

  get telefonoUrl(): string {
    const limpio = (this.empresa?.telefono ?? '').replace(/[^\d+]/g, '');
    return limpio ? `tel:${limpio}` : '';
  }

  get tieneContacto(): boolean {
    const empresa = this.empresa;
    if (!empresa) return false;
    return Boolean(
      empresa.telefono || empresa.whatsapp || empresa.correo || empresa.direccion || this.ubicacion,
    );
  }

  iniciales(): string {
    const partes = (this.empresa?.nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'E';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  inicialesMiembro(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  portada(empresa: Empresa): string | null {
    return empresa.portadaUrl ? `url("${empresa.portadaUrl}")` : null;
  }

  zIndex(componente: ComponenteLienzo): number {
    return componente.detras ? 0 : componente.capa + 1;
  }


  get haySesion(): boolean {
    return Boolean(this.auth.currentUser()?.id);
  }

  /** Nombre del creador con su @, como se busca en el feed. */
  get handleCreador(): string {
    const empresa = this.empresa as any;
    return empresa?.creadaPor?.usuario ? `@${empresa.creadaPor.usuario}` : '';
  }

  seguirEmpresa(): void {
    if (!this.haySesion) {
      void this.router.navigate(['/acceso']);
      return;
    }

    const empresa = this.empresa;
    if (!empresa) return;

    const anterior = this.siguiendo();
    this.siguiendo.set(!anterior);
    this.seguidores.update((valor) => Math.max(0, valor + (anterior ? -1 : 1)));
    this.totalSeguidores.update((valor) => Math.max(0, valor + (anterior ? -1 : 1)));

    this.servicio.seguirRed(empresa.id).subscribe({
      next: (respuesta) => {
        this.siguiendo.set(respuesta.siguiendo);
        this.seguidores.set(respuesta.seguidores);
      },
      error: () => {
        this.siguiendo.set(anterior);
        this.seguidores.update((valor) => Math.max(0, valor + (anterior ? 1 : -1)));
      },
    });
  }

  abrirChat(): void {
    if (!this.haySesion) {
      void this.router.navigate(['/acceso']);
      return;
    }

    const empresa = this.empresa;
    if (!empresa) return;

    this.panelLateral.abrirChatDeEmpresa(empresa.id);
  }

  get publicacionesRed(): PublicacionRed[] {
    return this.red()?.publicaciones ?? [];
  }

  get miembros(): MiembroEmpresa[] {
    return this.red()?.miembros ?? this.equipo;
  }

  get redes(): { nombre: string; url: string }[] {
    return this.red()?.redes ?? [];
  }

  get espaciosPublicos(): EspacioEmpresa[] {
    return this.espacios().length ? this.espacios() : (this.red()?.espacios ?? []);
  }

  private cargarEnlaces(empresaId: string): void {
    this.linkHub
      .getDeEmpresa(empresaId)
      .pipe(catchError(() => of([])))
      .subscribe((lista) => this.enlaces.set(lista ?? []));
  }

  get enlacesDeEmpresa(): LinkItem[] {
    return this.enlaces();
  }

  get tarjetasDeEquipo(): MiembroEmpresa[] {
    return (this.red()?.miembros ?? []).filter((miembro) => miembro.visibleEnEquipo);
  }

  urlTarjeta(miembro: MiembroEmpresa): string {
    const slug = this.empresa?.slug ?? '';
    return `/tarjeta/${miembro.usuarioId}?empresa=${slug}`;
  }

  get puedeEditar(): boolean {
    return Boolean(this.red()?.puedeEditar);
  }

  get urlRedEmpresa(): string {
    return `/empresa/${this.empresa?.slug ?? ''}`;
  }

  get seguidoresRed(): MiembroEmpresa[] {
    return this.red()?.seguidoresLista ?? [];
  }

  get totalMiembros(): number {
    return this.miembros.length;
  }

  get totalPublicaciones(): number {
    return this.publicacionesRed.length;
  }

  contarTipo(tipo: string): number {
    return this.piezas.filter((pieza) => pieza.tipo === tipo).length;
  }

  cambiarTab(tab: 'inicio' | 'publicaciones' | 'miembros' | 'seguidores' | 'propuestas' | 'informacion' | 'espacios' | 'enlaces' | 'tarjetas'): void {
    this.tab.set(tab);
  }

  actualizarBorrador(evento: Event): void {
    this.borrador.set((evento.target as HTMLTextAreaElement).value);
  }

  publicar(): void {
    const empresa = this.empresa;
    const texto = this.borrador().trim();
    if (!empresa || !texto || this.publicando()) return;

    if (!this.haySesion) {
      void this.router.navigate(['/acceso']);
      return;
    }

    this.publicando.set(true);
    this.servicio.publicarComoEmpresa(empresa.id, texto).subscribe({
      next: (publicacion) => {
        this.red.update((actual) =>
          actual ? { ...actual, publicaciones: [publicacion, ...actual.publicaciones] } : actual,
        );
        this.borrador.set('');
        this.publicando.set(false);
        this.toast.show('Publicación creada');
      },
      error: () => {
        this.toast.show('No se pudo publicar. Revisa tu rol en la empresa.');
        this.publicando.set(false);
      },
    });
  }

  get propuestas(): PublicacionRed[] {
    return this.red()?.pendientes ?? [];
  }

  get totalPropuestas(): number {
    return this.propuestas.length;
  }

  aprobarPropuesta(publicacion: PublicacionRed): void {
    const empresa = this.empresa;
    if (!empresa) return;

    this.servicio.aprobarPropuesta(empresa.id, publicacion.id).subscribe({
      next: () => {
        this.toast.show('Publicación aprobada');
        this.recargarRed();
      },
      error: () => this.toast.show('No se pudo aprobar la propuesta'),
    });
  }

  rechazarPropuesta(publicacion: PublicacionRed): void {
    const empresa = this.empresa;
    if (!empresa) return;

    this.servicio.rechazarPropuesta(empresa.id, publicacion.id).subscribe({
      next: () => {
        this.toast.show('Propuesta rechazada');
        this.recargarRed();
      },
      error: () => this.toast.show('No se pudo rechazar la propuesta'),
    });
  }

  borrarPublicacion(publicacion: PublicacionRed): void {
    const empresa = this.empresa;
    if (!empresa || !publicacion) return;

    this.servicio.borrarPublicacionEmpresa(empresa.id, publicacion.id).subscribe({
      next: () => {
        this.red.update((actual) =>
          actual
            ? { ...actual, publicaciones: actual.publicaciones.filter((item) => item.id !== publicacion.id) }
            : actual,
        );
        this.toast.show('Publicación eliminada');
      },
      error: () => this.toast.show('No se pudo eliminar la publicación'),
    });
  }

  meGusta(publicacion: PublicacionRed): void {
    if (!this.haySesion) {
      void this.router.navigate(['/acceso']);
      return;
    }

    const empresa = this.empresa;
    if (!empresa) return;

    const anterior = Boolean(publicacion.meGusta);
    this.red.update((actual) =>
      actual
        ? {
            ...actual,
            publicaciones: actual.publicaciones.map((item) =>
              item.id === publicacion.id
                ? {
                    ...item,
                    meGusta: !anterior,
                    likes: Math.max(0, item.likes + (anterior ? -1 : 1)),
                  }
                : item,
            ),
          }
        : actual,
    );

    this.servicio
      .meGustaRed(empresa.id, publicacion.id)
      .pipe(catchError(() => of(null)))
      .subscribe((respuesta) => {
        if (respuesta) return;
        this.red.update((actual) =>
          actual
            ? {
                ...actual,
                publicaciones: actual.publicaciones.map((item) =>
                  item.id === publicacion.id
                    ? { ...item, meGusta: anterior, likes: publicacion.likes }
                    : item,
                ),
              }
            : actual,
        );
      });
  }

  escribirAMiembro(miembro: MiembroEmpresa): void {
    if (!this.haySesion) {
      void this.router.navigate(['/acceso']);
      return;
    }

    this.panelLateral.abrirChatCon({
      id: miembro.usuarioId,
      name: miembro.nombre,
      avatar: miembro.avatarUrl ?? null,
      statusText: miembro.puesto || miembro.rolEtiqueta,
    });
  }

  irALanding(): void {
    const url = this.urlLanding();
    if (url) void this.router.navigateByUrl(url);
  }

  irAEspacio(espacio: EspacioEmpresa): void {
    void this.router.navigate(['/empresa', this.empresa?.slug, 'espacio', espacio.slug]);
  }

  private disenoDe(datos: EmpresaPublica) {
    return {
      acento: datos.diseno.acento ?? null,
      secundario: datos.diseno.secundario ?? null,
      fondoUrl: datos.diseno.fondoUrl ?? null,
      css: datos.diseno.css ?? null,
      activo: datos.diseno.activo,
    };
  }

  private cargarRed(empresaId: string): void {
    this.servicio.perfilRed(empresaId).subscribe((red) => {
      if (!red) return;
      this.red.set(red);
      this.siguiendo.set(red.siguiendo);
      this.seguidores.set(red.seguidores);
      this.totalSeguidores.set(red.seguidores);
      this.seguidos.set(red.seguidos ?? red.miembros?.length ?? 0);
      if (red.espacios?.length) this.espacios.set(red.espacios);

      const principal = red.espacioPrincipal ?? red.espacios?.find((espacio) => espacio.esPrincipal);
      if (principal) this.urlLanding.set(this.urlDeEspacio(principal.slug));
    });
  }

  private cargarLanding(slug: string, empresaId: string): void {
    if (this.urlLanding()) return;

    this.servicio.espacioPrincipal(slug, empresaId).subscribe((espacio) => {
      if (espacio) this.urlLanding.set(this.urlDeEspacio(espacio.slug));
    });
  }

  private urlDeEspacio(espacioSlug: string): string {
    return `/empresa/${this.empresa?.slug ?? ''}/espacio/${espacioSlug}`;
  }

  private escucharActualizaciones(): void {
    window.removeEventListener('empresa-red-actualizar', this.recargarRed);
    window.addEventListener('empresa-red-actualizar', this.recargarRed);
  }

  private observar(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('resize', this.ajustar);

    if (typeof ResizeObserver === 'undefined') return;

    const marco = this.marco?.nativeElement;
    if (!marco) return;

    this.observador?.disconnect();
    this.observador = new ResizeObserver(() => this.calcular());
    this.observador.observe(marco);
  }

  private calcular(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const marco = this.marco?.nativeElement;
    if (!marco) return;

    const disponible = marco.clientWidth;
    if (disponible <= 0) return;

    this.escala.set(Math.max(0.2, Math.min(1, disponible / LIENZO_ANCHO)));
  }
}

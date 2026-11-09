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

import {
  ComponenteLienzo,
  DisenoLienzo,
  Empresa,
  EmpresaPublica,
  MiembroEmpresa,
} from '../../../core/models/empresa.model';
import { DisenoService } from '../../../core/services/diseno.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { AuthService } from '../../../core/services/auth.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { PostService } from '../../../core/services/post.service';
import {
  LIENZO_ALTO,
  LIENZO_ANCHO,
  etiquetaOpcion,
  etiquetaTipoEmpresa,
  leerJson,
} from '../empresa-ui';
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';

interface PublicacionEmpresa {
  id: string;
  content?: string;
  createdAt?: string;
  autorNombre?: string;
  nombreAutor?: string;
  autorUsername?: string;
  username?: string;
  likesCount?: number;
  commentsCount?: number;
}

@Component({
  selector: 'app-empresa-publica',
  standalone: true,
  imports: [CommonModule, RouterLink, EmpresaComponenteVistaComponent],
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
  private publicaciones = inject(PostService);

  @ViewChild('marco') marco?: ElementRef<HTMLElement>;

  readonly datos = signal<EmpresaPublica | null>(null);
  readonly cargando = signal(true);
  readonly escala = signal(0.5);
  readonly siguiendo = signal(false);
  readonly publicacionesEquipo = signal<PublicacionEmpresa[]>([]);
  readonly cargandoPublicaciones = signal(true);

  readonly ancho = LIENZO_ANCHO;
  readonly alto = LIENZO_ALTO;

  private observador: ResizeObserver | null = null;
  private ajustar = (): void => this.calcular();

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
      this.diseno.aplicarAjeno({
        acento: datos.diseno.acento ?? null,
        secundario: datos.diseno.secundario ?? null,
        fondoUrl: datos.diseno.fondoUrl ?? null,
        css: datos.diseno.css ?? null,
        activo: datos.diseno.activo,
      });

      if (isPlatformBrowser(this.platformId)) {
        this.cargarPublicaciones();

        setTimeout(() => {
          this.observar();
          this.calcular();
        }, 40);
      }
    });
  }

  ngOnDestroy(): void {
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

    this.siguiendo.update((valor) => !valor);
  }

  abrirChat(): void {
    if (!this.haySesion) {
      void this.router.navigate(['/acceso']);
      return;
    }

    const creador = (this.empresa as any)?.creadaPor;
    if (!creador?.id) return;

    this.panelLateral.abrirChatCon({
      id: creador.id,
      name: creador.nombre ?? this.empresa?.nombre ?? 'Empresa',
      gitUsername: creador.usuario,
      statusText: this.empresa?.nombre ?? '',
    });
  }

  private cargarPublicaciones(): void {
    const creador = (this.empresa as any)?.creadaPor?.id;
    if (!creador) {
      this.cargandoPublicaciones.set(false);
      return;
    }

    this.publicaciones.feed(creador, 0, 12).subscribe({
      next: (pagina) => {
        this.publicacionesEquipo.set((pagina?.content ?? []) as PublicacionEmpresa[]);
        this.cargandoPublicaciones.set(false);
      },
      error: () => this.cargandoPublicaciones.set(false),
    });
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

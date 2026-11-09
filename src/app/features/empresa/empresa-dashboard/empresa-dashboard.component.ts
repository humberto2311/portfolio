import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { EmpresaService } from '../../../core/services/empresa.service';
import { DisenoService } from '../../../core/services/diseno.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Empresa,
  MiembroEmpresa,
  ComponenteLienzo,
} from '../../../core/models/empresa.model';
import {
  LIENZO_ALTO,
  LIENZO_ANCHO,
  etiquetaOpcion,
  porcentaje,
  etiquetaTipoEmpresa,
  origenPublico,
} from '../empresa-ui';
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';

@Component({
  selector: 'app-empresa-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, EmpresaComponenteVistaComponent],
  templateUrl: './empresa-dashboard.component.html',
  styleUrls: ['./empresa-dashboard.component.scss'],
})
export class EmpresaDashboardComponent implements OnInit, OnDestroy {
  readonly empresa = inject(EmpresaService);
  private diseno = inject(DisenoService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private host = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  readonly panel = this.empresa.panel;
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly escala = signal(0.35);

  readonly ancho = LIENZO_ANCHO;
  readonly alto = LIENZO_ALTO;

  private ajustar = (): void => this.ajustarEscala();

  ngOnInit(): void {
    this.diseno.limpiarAjeno();

    this.empresa.cargarMis().subscribe((mias) => {
      if (!mias.length) {
        this.cargando.set(false);
        return;
      }

      const activa = this.empresa.activaId() ?? mias[0].id;
      if (!this.empresa.activaId()) this.empresa.entrar(activa);
      this.cargar(activa);
    });

    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', this.ajustar);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.ajustar);
    }
    this.diseno.limpiarAjeno();
  }

  get actual(): Empresa | null {
    return this.panel()?.empresa ?? this.empresa.empresaActual();
  }

  get acceso() {
    return this.panel()?.acceso ?? null;
  }

  get componentes(): ComponenteLienzo[] {
    return this.panel()?.componentes ?? [];
  }

  get componentesOrdenados(): ComponenteLienzo[] {
    return [...this.componentes].sort((a, b) => {
      if (a.detras !== b.detras) return a.detras ? -1 : 1;
      return a.capa - b.capa;
    });
  }

  get equipo(): MiembroEmpresa[] {
    return (this.panel()?.miembros ?? []).filter((miembro) => miembro.visibleEnEquipo);
  }

  get documentosPendientes(): string[] {
    return this.actual?.documentosFaltantes ?? [];
  }

  get documentosCargados(): number {
    return (this.panel()?.documentos ?? []).filter((documento) => documento.estado === 'VALIDADO').length;
  }

  get publicados(): number {
    return this.componentes.filter((componente) => componente.visible).length;
  }

  get esPersonal(): boolean {
    return this.actual?.tipo === 'PERSONAL';
  }

  get nombreTipo(): string {
    return etiquetaOpcion(this.empresa.catalogo(), 'tipos', this.actual?.tipo);
  }

  get nombreSector(): string {
    return etiquetaOpcion(this.empresa.catalogo(), 'sectores', this.actual?.sector);
  }

  get acento(): string {
    return this.panel()?.diseno?.acento ?? '#2563eb';
  }

  get portada(): Record<string, string> {
    const url = this.actual?.portadaUrl;
    return url ? { 'background-image': `url("${url}")` } : {};
  }

  get autorizadoDiseno(): boolean {
    return Boolean(this.acceso?.editaLienzo || this.acceso?.creaComponentes);
  }

  get urlPublica(): string {
    const slug = this.actual?.slug;
    return slug ? `${origenPublico()}/${slug}` : origenPublico();
  }

  get progresoDocumentos(): number {
    if (this.esPersonal) return 100;
    const total = (this.actual?.documentosFaltantes?.length ?? 0) + this.documentosCargados;
    return porcentaje(this.documentosCargados, total || 1);
  }

  iniciales(): string {
    const nombre = this.actual?.nombre ?? '';
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'EM';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  tipoEtiqueta(): string {
    return this.nombreTipo || etiquetaTipoEmpresa(this.actual);
  }

  entrar(empresa: Empresa): void {
    if (empresa.id === this.empresa.activaId()) return;
    this.empresa.entrar(empresa.id);
    this.cargar(empresa.id);
  }

  entrarPorId(evento: Event): void {
    const id = (evento.target as HTMLSelectElement).value;
    const elegida = this.empresa.listado().find((item) => item.id === id);
    if (elegida) this.entrar(elegida);
  }

  salir(): void {
    this.empresa.salir();
    this.diseno.limpiarAjeno();
    this.router.navigate(['/app']);
  }

  copiarEnlace(): void {
    const url = this.urlPublica;
    if (isPlatformBrowser(this.platformId) && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => this.toast.show('Enlace copiado'),
        () => this.toast.show(url),
      );
      return;
    }
    this.toast.show(url);
  }

  whatsapp(valor: string | null | undefined): string {
    const limpio = (valor ?? '').replace(/[^\d]/g, '');
    return limpio ? `https://wa.me/${limpio}` : '#';
  }

  correo(valor: string | null | undefined): string {
    return valor ? `mailto:${valor}` : '#';
  }

  zIndex(componente: ComponenteLienzo): number {
    return componente.detras ? 0 : componente.capa + 1;
  }

  abrirPublica(): void {
    if (!this.actual) return;
    this.router.navigate(['/empresa', this.actual.slug]);
  }

  ajustarEscala(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const caja = (this.host.nativeElement as HTMLElement).querySelector('.mini-lienzo');
    if (!caja) return;
    const ancho = caja.clientWidth;
    if (ancho > 0) this.escala.set(Math.min(1, Math.max(0.2, ancho / LIENZO_ANCHO)));
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.error.set(null);

    this.empresa.cargarPanel(id).subscribe((panel) => {
      this.cargando.set(false);

      if (!panel) {
        this.error.set('No se pudo cargar la empresa. Revisa tu conexión o tus permisos.');
        return;
      }

      this.diseno.aplicarAjeno({
        acento: panel.diseno.acento ?? null,
        secundario: panel.diseno.secundario ?? null,
        fondoUrl: panel.diseno.fondoUrl ?? null,
        css: panel.diseno.css ?? null,
        activo: panel.diseno.activo,
      });

      setTimeout(() => this.ajustarEscala(), 40);
    });
  }
}

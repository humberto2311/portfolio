import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  ComponenteLienzo,
  DisenoLienzo,
  Empresa,
  EspacioEmpresa,
  MiembroEmpresa,
  PublicacionRed,
  SeccionEspacio,
} from '../../../core/models/empresa.model';
import { EmpresaService } from '../../../core/services/empresa.service';
import { DisenoService } from '../../../core/services/diseno.service';
import { AuthService } from '../../../core/services/auth.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';
import { EspacioNavbarComponent } from './espacio-navbar.component';
import { anclaSeccion, urlRed } from './espacio-ui';

interface BloqueTexto {
  titulo: string;
  texto: string;
}

interface FilaContacto {
  icono: string;
  etiqueta: string;
  valor: string;
  url: string | null;
}

@Component({
  selector: 'app-espacio-publico',
  standalone: true,
  imports: [CommonModule, RouterLink, EspacioNavbarComponent, EmpresaComponenteVistaComponent],
  templateUrl: './espacio-publico.component.html',
  styleUrls: ['./espacio-publico.component.scss'],
})
export class EspacioPublicoComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaService = inject(EmpresaService);
  private diseno = inject(DisenoService);
  private auth = inject(AuthService);
  private panelLateral = inject(SidePanelService);

  readonly espacio = signal<EspacioEmpresa | null>(null);
  readonly cargando = signal(true);
  readonly red = signal<{
    miembros: MiembroEmpresa[];
    publicaciones: PublicacionRed[];
    puedeEditar: boolean;
  }>({
    miembros: [],
    publicaciones: [],
    puedeEditar: false,
  });
  readonly piezas = signal<ComponenteLienzo[]>([]);
  readonly piezasPorSeccion = signal<Record<string, ComponenteLienzo[]>>({});
  readonly disenos = signal<DisenoLienzo[]>([]);
  readonly redEmpresa = signal<Empresa | null>(null);

  readonly esPrevia = signal(false);

  volverAlEditor(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    const espacioSlug = this.route.snapshot.paramMap.get('espacio');
    void this.router.navigate(['/app/empresa/espacio'], {
      queryParams: espacioSlug ? { espacio: espacioSlug } : {},
    });
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    const espacioSlug = this.route.snapshot.paramMap.get('espacio');
    this.esPrevia.set(this.route.snapshot.queryParamMap.get('vista') === 'previa');

    if (!slug || !espacioSlug) {
      this.cargando.set(false);
      return;
    }

    this.empresaService.espacioParaVer(slug, espacioSlug).subscribe((espacio) => {
      this.cargando.set(false);
      if (!espacio) return;

      this.espacio.set(espacio);
      this.aplicarColores(espacio);
      this.cargarRed(espacio);
      this.cargarLienzo(espacio);
    });
  }

  ngOnDestroy(): void {
    this.diseno.limpiarAjeno();
  }

  get haySesion(): boolean {
    return Boolean(this.auth.currentUser()?.id);
  }

  get puedeEditar(): boolean {
    return this.red().puedeEditar;
  }

  get urlPerfil(): string {
    return urlRed(this.espacio()?.empresaSlug ?? '');
  }

  get secciones(): SeccionEspacio[] {
    return [...(this.espacio()?.secciones ?? [])]
      .filter((seccion) => seccion.visible)
      .sort((a, b) => a.orden - b.orden);
  }

  get espacioNavbar(): EspacioEmpresa | null {
    const base = this.espacio();
    if (!base) return null;
    return { ...base, secciones: this.secciones };
  }

  get iniciales(): string {
    const partes = (this.espacio()?.empresaNombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'E';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  inicialesDe(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  ancla(seccion: SeccionEspacio): string {
    return anclaSeccion(seccion);
  }

  altoSeccion(seccion: SeccionEspacio): string {
    return seccion.estilo === 'alto' ? 'seccion--alta' : '';
  }

  centrada(seccion: SeccionEspacio): boolean {
    return seccion.alineacion === 'center';
  }

  bloques(texto: string | null | undefined): BloqueTexto[] {
    const limpio = (texto ?? '').trim();
    if (!limpio) return [];

    return limpio
      .split(/\n{2,}/)
      .map((bloque) => {
        const [primera, ...resto] = bloque.split('\n');
        return { titulo: (primera ?? '').trim(), texto: resto.join(' ').trim() };
      })
      .filter((bloque) => bloque.titulo || bloque.texto);
  }

  parrafos(texto: string | null | undefined): string[] {
    return (texto ?? '')
      .split(/\n{2,}/)
      .map((parrafo) => parrafo.trim())
      .filter(Boolean);
  }

  get miembros(): MiembroEmpresa[] {
    return this.red().miembros;
  }

  get publicaciones(): PublicacionRed[] {
    return this.red().publicaciones;
  }

  get contacto(): FilaContacto[] {
    const empresa = this.redEmpresa();
    if (!empresa) return [];

    const filas: FilaContacto[] = [];
    const numero = (valor: string | null | undefined): string => (valor ?? '').replace(/[^\d]/g, '');

    if (empresa.telefono) {
      filas.push({
        icono: 'fa-solid fa-phone',
        etiqueta: 'Teléfono',
        valor: empresa.telefono,
        url: `tel:${empresa.telefono.replace(/[^\d+]/g, '')}`,
      });
    }

    if (empresa.whatsapp) {
      filas.push({
        icono: 'fa-brands fa-whatsapp',
        etiqueta: 'WhatsApp',
        valor: empresa.whatsapp,
        url: `https://wa.me/${numero(empresa.whatsapp)}`,
      });
    }

    if (empresa.correo) {
      filas.push({
        icono: 'fa-solid fa-envelope',
        etiqueta: 'Correo',
        valor: empresa.correo,
        url: `mailto:${empresa.correo}`,
      });
    }

    if (empresa.sitioWeb) {
      filas.push({
        icono: 'fa-solid fa-globe',
        etiqueta: 'Sitio web',
        valor: empresa.sitioWeb,
        url: empresa.sitioWeb,
      });
    }

    if (empresa.direccion) {
      filas.push({
        icono: 'fa-solid fa-map',
        etiqueta: 'Dirección',
        valor: empresa.direccion,
        url: null,
      });
    }

    if (empresa.ciudad || empresa.departamento) {
      filas.push({
        icono: 'fa-solid fa-location-dot',
        etiqueta: 'Ubicación',
        valor: [empresa.ciudad, empresa.departamento].filter(Boolean).join(', '),
        url: null,
      });
    }

    if (empresa.horario) {
      filas.push({
        icono: 'fa-solid fa-clock',
        etiqueta: 'Horario',
        valor: empresa.horario,
        url: null,
      });
    }

    return filas;
  }

  get redes(): { nombre: string; url: string }[] {
    const empresa = this.redEmpresa();
    if (!empresa) return [];

    const redes: { nombre: string; url: string }[] = [];
    if (empresa.instagramUrl) redes.push({ nombre: 'Instagram', url: empresa.instagramUrl });
    if (empresa.facebookUrl) redes.push({ nombre: 'Facebook', url: empresa.facebookUrl });
    if (empresa.tiktokUrl) redes.push({ nombre: 'TikTok', url: empresa.tiktokUrl });
    if (empresa.sitioWeb) redes.push({ nombre: 'Sitio web', url: empresa.sitioWeb });
    return redes;
  }

  iconoRed(nombre: string): string {
    switch (nombre) {
      case 'Instagram':
        return 'fa-brands fa-instagram';
      case 'Facebook':
        return 'fa-brands fa-facebook-f';
      case 'TikTok':
        return 'fa-brands fa-tiktok';
      default:
        return 'fa-solid fa-globe';
    }
  }

  abrirChatEmpresa(): void {
    const empresa = this.redEmpresa();
    if (!empresa) return;

    if (!this.haySesion) {
      void this.router.navigate(['/acceso']);
      return;
    }

    this.panelLateral.abrirChatDeEmpresa(empresa.id);
  }

  get urlEmpresa(): string {
    return this.urlPerfil;
  }

  irAPerfil(): void {
    void this.router.navigateByUrl(this.urlPerfil);
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

  private cargarRed(espacio: EspacioEmpresa): void {
    this.empresaService.perfilRed(espacio.empresaId).subscribe((red) => {
      if (!red) return;

      this.red.set({
        miembros: red.miembros,
        publicaciones: red.publicaciones,
        puedeEditar: red.puedeEditar,
      });
      this.redEmpresa.set(red.empresa ?? null);
    });
  }

  private cargarLienzo(espacio: EspacioEmpresa): void {
    const usaDiseno = (espacio.secciones ?? []).some(
      (seccion) => seccion.visible && seccion.tipo === 'LIENZO',
    );

    if (usaDiseno) this.cargarDisenosDeSecciones(espacio);

    if (!usaDiseno || !espacio.disenoSlug) return;

    forkJoin({
      diseno: this.empresaService.disenoPublico(espacio.disenoSlug).pipe(catchError(() => of(null))),
      privado: this.haySesion
        ? this.empresaService.disenoPrivado(espacio.disenoSlug).pipe(catchError(() => of(null)))
        : of(null as DisenoLienzo | null),
    })
      .pipe(map(({ diseno, privado }) => privado ?? diseno))
      .subscribe((diseno) => {
        if (!diseno) return;
        this.piezas.set(
          [...(diseno.piezas ?? [])]
            .filter((pieza) => pieza.visible)
            .sort((a, b) => (a.detras === b.detras ? a.capa - b.capa : a.detras ? -1 : 1)),
        );
      });
  }

  piezasDe(seccion: SeccionEspacio): ComponenteLienzo[] {
    return this.piezasPorSeccion()[this.claveSeccion(seccion)] ?? [];
  }

  disenoDe(seccion: SeccionEspacio): DisenoLienzo | null {
    if (!seccion.disenoSlug) return null;
    return this.disenos().find((diseno) => diseno.slug === seccion.disenoSlug) ?? null;
  }

  private claveSeccion(seccion: SeccionEspacio): string {
    return seccion.id ?? `${seccion.tipo}-${seccion.orden}`;
  }

  private cargarDisenosDeSecciones(espacio: EspacioEmpresa): void {
    const slugs = [...new Set(
      (espacio.secciones ?? [])
        .filter((seccion) => seccion.visible && seccion.disenoSlug)
        .map((seccion) => seccion.disenoSlug as string),
    )];

    if (!slugs.length) return;

    for (const slug of slugs) {
      this.empresaService
        .disenoPublico(slug)
        .pipe(catchError(() => of(null)))
        .subscribe((diseno) => {
          if (!diseno) return;

          const piezas = [...(diseno.piezas ?? [])]
            .filter((pieza) => pieza.visible)
            .sort((a, b) => (a.detras === b.detras ? a.capa - b.capa : a.detras ? -1 : 1));

          this.disenos.update((lista) => [...lista.filter((item) => item.slug !== slug), diseno]);

          const mapa = { ...this.piezasPorSeccion() };
          for (const seccion of espacio.secciones ?? []) {
            if (seccion.disenoSlug === slug) mapa[this.claveSeccion(seccion)] = piezas;
          }
          this.piezasPorSeccion.set(mapa);
        });
    }
  }

  private aplicarColores(espacio: EspacioEmpresa): void {
    this.diseno.aplicarAjeno({
      acento: espacio.colorPrincipal ?? null,
      secundario: espacio.colorSecundario ?? null,
      fondoUrl: null,
      css: null,
      activo: Boolean(espacio.colorPrincipal || espacio.colorSecundario),
    });
  }
}

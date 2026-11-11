import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { RailStateService } from '../../../core/services/rail-state.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { Empresa } from '../../../core/models/empresa.model';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

interface RailItem {
  label: string;
  icon: string;
  ruta?: string;
  exacto?: boolean;
  accion?: 'mensajes' | 'salir' | 'ajustes';
  nota?: string;
}

const NAVEGACION_PERSONAL: RailItem[] = [
  { label: 'Inicio', icon: 'fa-solid fa-house', ruta: '/app', exacto: true },
  { label: 'Mi panel', icon: 'fa-solid fa-chart-pie', ruta: '/app/dashboard' },
  { label: 'Mi perfil', icon: 'fa-solid fa-id-badge', ruta: '/app/perfil' },
  { label: 'Mapa de conexiones', icon: 'fa-solid fa-map-location-dot', ruta: '/app/ubicacion' },
  { label: 'Talento', icon: 'fa-solid fa-magnifying-glass', ruta: '/app/talento' },
  { label: 'Mensajes', icon: 'fa-solid fa-comment-dots', accion: 'mensajes' },
  { label: 'Portafolio', icon: 'fa-solid fa-briefcase', ruta: '/app/portafolio' },
  { label: 'Proyectos', icon: 'fa-solid fa-diagram-project', ruta: '/app/proyectos' },
  { label: 'Mis enlaces', icon: 'fa-solid fa-link', ruta: '/app/hub' },
  { label: 'Hoja de vida', icon: 'fa-solid fa-file-lines', ruta: '/app/informacion-personal' },
];

const NAVEGACION_EMPRESA: RailItem[] = [
  { label: 'Perfil en la red', icon: 'fa-solid fa-building', ruta: '/app/empresa', exacto: true, nota: 'Lo que ven los demás' },
  { label: 'Mi espacio', icon: 'fa-solid fa-globe', ruta: '/app/empresa/espacio', nota: 'Tu landing' },
  { label: 'Diseño', icon: 'fa-solid fa-pen-ruler', ruta: '/app/empresa/lienzo', nota: 'Armar secciones' },
  { label: 'Mis diseños', icon: 'fa-solid fa-folder-open', ruta: '/app/empresa/disenos', nota: 'Componentes' },
  { label: 'Panel de la empresa', icon: 'fa-solid fa-chart-pie', ruta: '/app/dashboard/empresa' },
  { label: 'Mi actividad', icon: 'fa-solid fa-user-tie', ruta: '/app/dashboard/empresa/mi-actividad' },
  { label: 'Equipo', icon: 'fa-solid fa-users', ruta: '/app/empresa/ajustes?tab=equipo' },
  { label: 'Enlaces de la empresa', icon: 'fa-solid fa-link', ruta: '/app/empresa/enlaces', nota: 'Del equipo' },
  { label: 'Tarjetas del equipo', icon: 'fa-solid fa-address-card', ruta: '/app/empresa/tarjetas', nota: 'vCards' },
  { label: 'Mensajes', icon: 'fa-solid fa-comment-dots', accion: 'mensajes' },
];

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
})
export class SideNavComponent {
  private auth = inject(AuthService);
  private destruir = inject(DestroyRef);
  private perfiles = inject(UserProfileService);
  private router = inject(Router);
  readonly mensajes = inject(SidePanelService);
  readonly rail = inject(RailStateService);
  readonly empresa = inject(EmpresaService);

  readonly user = this.auth.currentUser;
  readonly avatar = this.perfiles.avatar;

  constructor() {
    this.empresa.cargarMis().pipe(takeUntilDestroyed(this.destruir)).subscribe();

    effect(() => {
      this.empresa.enModoEmpresa();
      this.espaciosAbiertos.set(false);
    });
  }

  get navegacion(): RailItem[] {
    return this.empresa.enModoEmpresa() ? NAVEGACION_EMPRESA : NAVEGACION_PERSONAL;
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

  readonly espaciosAbiertos = signal(false);

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

  get espacioActual(): { id: string; nombre: string; rol: string } | null {
    const activa = this.empresa.empresaActual();
    if (!activa) return null;
    return { id: activa.id, nombre: activa.nombre, rol: activa.rolEtiqueta ?? 'Miembro' };
  }

  get hayEspacios(): boolean {
    return this.misEmpresas.length > 0;
  }

  alternarEspacios(): void {
    this.espaciosAbiertos.update((valor) => !valor);
    if (this.espaciosAbiertos()) {
      this.empresa.cargarMis(true).subscribe();
    }
  }

  irAEspacio(id: string): void {
    this.espaciosAbiertos.set(false);
    this.empresa.entrar(id);
    void this.router.navigateByUrl('/app/empresa').then(() => window.scrollTo({ top: 0 }));
  }

  irAPersonal(): void {
    this.espaciosAbiertos.set(false);
    this.empresa.salir();
    void this.router.navigateByUrl('/app/perfil');
  }

  irAperfilPersonal(): void {
    this.espaciosAbiertos.set(false);
    void this.router.navigateByUrl('/app/perfil');
  }

  iniciales(): string {
    const nombre = this.user()?.fullName ?? '';
    return nombre.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  subtitulo(): string {
    const usuario = this.user();
    return usuario?.gitUsername ? `@${usuario.gitUsername}` : (usuario?.email ?? '');
  }

  abrirMensajes(): void {
    this.mensajes.openContacts();
  }
}

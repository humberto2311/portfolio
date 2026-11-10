import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { RailStateService } from '../../../core/services/rail-state.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

interface RailItem {
  label: string;
  icon: string;
  ruta?: string;
  exacto?: boolean;
  accion?: 'mensajes' | 'salir';
}

const NAVEGACION_PERSONAL: RailItem[] = [
  { label: 'Inicio', icon: 'fa-solid fa-house', ruta: '/app', exacto: true },
  { label: 'Mi panel', icon: 'fa-solid fa-chart-pie', ruta: '/app/dashboard' },
  { label: 'Mapa de conexiones', icon: 'fa-solid fa-map-location-dot', ruta: '/app/ubicacion' },
  { label: 'Buscar trabajo', icon: 'fa-solid fa-briefcase', ruta: '/app/empleo' },
  { label: 'Talento', icon: 'fa-solid fa-magnifying-glass', ruta: '/app/talento' },
  { label: 'Mensajes', icon: 'fa-solid fa-comment-dots', accion: 'mensajes' },
  { label: 'Portafolio', icon: 'fa-solid fa-briefcase', ruta: '/app/portafolio' },
  { label: 'Proyectos', icon: 'fa-solid fa-diagram-project', ruta: '/app/proyectos' },
  { label: 'Mis enlaces', icon: 'fa-solid fa-link', ruta: '/app/hub' },
  { label: 'Hoja de vida', icon: 'fa-solid fa-file-lines', ruta: '/app/informacion-personal' },
];

const NAVEGACION_EMPRESA: RailItem[] = [
  { label: 'Mi empresa', icon: 'fa-solid fa-building', ruta: '/app/empresa', exacto: true },
  { label: 'Panel de control', icon: 'fa-solid fa-chart-pie', ruta: '/app/dashboard/empresa' },
  { label: 'Mi actividad', icon: 'fa-solid fa-user-tie', ruta: '/app/dashboard/empresa/mi-actividad' },
  { label: 'Mapa de conexiones', icon: 'fa-solid fa-map-location-dot', ruta: '/app/ubicacion' },
  { label: 'Diseño', icon: 'fa-solid fa-pen-ruler', ruta: '/app/empresa/lienzo' },
  { label: 'Mis diseños', icon: 'fa-solid fa-folder-open', ruta: '/app/empresa/disenos' },
  { label: 'Mensajes', icon: 'fa-solid fa-comment-dots', accion: 'mensajes' },
  { label: 'Equipo', icon: 'fa-solid fa-users', ruta: '/app/empresa/ajustes?tab=equipo' },
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
  private perfiles = inject(UserProfileService);
  private router = inject(Router);
  readonly mensajes = inject(SidePanelService);
  readonly rail = inject(RailStateService);
  readonly empresa = inject(EmpresaService);

  readonly user = this.auth.currentUser;
  readonly avatar = this.perfiles.avatar;

  get navegacion(): RailItem[] {
    return this.empresa.enModoEmpresa() ? NAVEGACION_EMPRESA : NAVEGACION_PERSONAL;
  }

  get salida(): RailItem[] {
    if (this.empresa.enModoEmpresa()) {
      return [
        { label: 'Ajustes de empresa', icon: 'fa-solid fa-gear', ruta: '/app/empresa/ajustes' },
        { label: 'Volver a mi perfil', icon: 'fa-solid fa-user', accion: 'salir' },
      ];
    }
    return [{ label: 'Ajustes', icon: 'fa-solid fa-gear', ruta: '/app/ajustes/cuenta' }];
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

  salirEmpresa(): void {
    this.empresa.salir();
    this.router.navigate(['/app']);
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

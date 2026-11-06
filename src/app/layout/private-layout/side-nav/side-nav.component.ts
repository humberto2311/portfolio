import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { RailStateService } from '../../../core/services/rail-state.service';

interface RailItem {
  label: string;
  icon: string;
  ruta?: string;
  exacto?: boolean;
  accion?: 'mensajes';
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
})
export class SideNavComponent {
  private auth = inject(AuthService);
  private perfiles = inject(UserProfileService);
  readonly mensajes = inject(SidePanelService);
  readonly rail = inject(RailStateService);

  readonly user = this.auth.currentUser;
  readonly avatar = this.perfiles.avatar;

  readonly navegacion: RailItem[] = [
    { label: 'Inicio', icon: 'fa-solid fa-house', ruta: '/app', exacto: true },
    { label: 'Talento', icon: 'fa-solid fa-magnifying-glass', ruta: '/app/talento' },
    { label: 'Mensajes', icon: 'fa-solid fa-comment-dots', accion: 'mensajes' },
    { label: 'Portafolio', icon: 'fa-solid fa-briefcase', ruta: '/app/portafolio' },
    { label: 'Proyectos', icon: 'fa-solid fa-diagram-project', ruta: '/app/proyectos' },
    { label: 'Mis enlaces', icon: 'fa-solid fa-link', ruta: '/app/hub' },
    { label: 'Hoja de vida', icon: 'fa-solid fa-file-lines', ruta: '/app/informacion-personal' },
  ];

  readonly salida: RailItem[] = [
    { label: 'Ajustes', icon: 'fa-solid fa-gear', ruta: '/app/ajustes/cuenta' },
  ];

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

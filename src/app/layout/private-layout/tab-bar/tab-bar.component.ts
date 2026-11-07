import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SidePanelService } from '../../../core/services/side-panel.service';

interface Destino {
  label: string;
  icon: string;
  ruta?: string;
  exacto?: boolean;
}

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './tab-bar.component.html',
  styleUrls: ['./tab-bar.component.scss'],
})
export class TabBarComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private perfiles = inject(UserProfileService);
  private mensajes = inject(SidePanelService);

  readonly user = this.auth.currentUser;
  readonly avatar = this.perfiles.avatar;
  readonly hoja = signal(false);

  readonly extras: Destino[] = [
    { label: 'Portafolio', icon: 'fa-solid fa-briefcase', ruta: '/app/portafolio' },
    { label: 'Proyectos', icon: 'fa-solid fa-diagram-project', ruta: '/app/proyectos' },
    { label: 'Mis enlaces', icon: 'fa-solid fa-link', ruta: '/app/hub' },
    { label: 'Hoja de vida', icon: 'fa-solid fa-file-lines', ruta: '/app/informacion-personal' },
    ...(Capacitor.isNativePlatform()
      ? [{ label: 'Emitir por NFC', icon: 'fa-solid fa-tower-broadcast', ruta: '/app/emisora' }]
      : []),
    { label: 'Ajustes de cuenta', icon: 'fa-solid fa-gear', ruta: '/app/ajustes/cuenta' },
    { label: 'Seguridad', icon: 'fa-solid fa-shield-halved', ruta: '/app/ajustes/seguridad' },
  ];

  iniciales(): string {
    const nombre = this.user()?.fullName ?? '';
    return nombre.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  alternarHoja(): void {
    this.hoja.update((v) => !v);
  }

  cerrarHoja(): void {
    this.hoja.set(false);
  }

  ir(ruta: string): void {
    this.cerrarHoja();
    this.router.navigate([ruta]);
  }

  abrirMensajes(): void {
    this.cerrarHoja();
    this.mensajes.openContacts();
  }

  logout(): void {
    this.cerrarHoja();
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

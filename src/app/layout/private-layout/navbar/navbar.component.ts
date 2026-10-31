import { Component, OnInit, inject, signal, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { ResumeService } from '../../../core/services/resume.service';
import {
  SugerenciaUsuario,
  UserDirectoryService,
} from '../../../core/services/user-directory.service';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { DropdownMenuComponent } from '../dropdown-menu/dropdown-menu.component';
import { NotificacionesComponent } from '../notificaciones/notificaciones.component';

@Component({
  selector: 'app-private-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    UserMenuComponent,
    DropdownMenuComponent,
    NotificacionesComponent,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class PrivateNavbarComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private elRef = inject(ElementRef);
  private perfilService = inject(PerfilService);
  private userProfileService = inject(UserProfileService);
  private resumeService = inject(ResumeService);
  private directorio = inject(UserDirectoryService);

  readonly user = this.auth.currentUser;
  searchQuery = '';
  readonly isMobileMenuOpen = signal(false);

  /** Rol que viene de userprofile (perfil-completo), no del token. */
  readonly rolPerfil = signal<string>('');

  // --- Sugerencias del buscador (sin @) ---
  sugerencias = signal<SugerenciaUsuario[]>([]);
  indice = signal(0);
  mostrarSugerencias = signal(false);

  private timer?: ReturnType<typeof setTimeout>;

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isMobileMenuOpen.set(false);
      this.cerrarSugerencias();
    }
  }

  ngOnInit(): void {
    // El rol se lee del userprofile (perfil-completo), no del JWT.
    const usuario = this.user();
    if (!usuario?.id) return;

    this.userProfileService.getPerfilCompletoPorId(usuario.id).subscribe({
      next: (perfil) => {
        const rol = (perfil?.role || perfil?.headline || '').trim();

        if (rol && rol.toLowerCase() !== 'user') {
          this.rolPerfil.set(rol);
          return;
        }

        // Si el perfil social no tiene rol, se usa el titular de la hoja de vida.
        this.resumeService.getProfileByUserId(usuario.id).subscribe({
          next: (rp) => {
            const headline = (rp?.headline || '').trim();
            if (headline) this.rolPerfil.set(headline);
          },
          error: () => {
            /* sin CV: el navbar muestra "User" */
          },
        });
      },
      error: () => {
        /* si falla, el navbar muestra "User" */
      },
    });
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  // ====== BUSCADOR ======

  onSearchInput(valor: string): void {
    this.searchQuery = valor;
    if (this.timer) clearTimeout(this.timer);

    const termino = valor.trim();
    if (!termino) {
      this.cerrarSugerencias();
      return;
    }

    this.timer = setTimeout(() => this.buscar(termino), 250);
  }

  private buscar(termino: string): void {
    this.directorio.buscar(termino, 8).subscribe({
      next: (lista) => {
        this.sugerencias.set(lista);
        this.mostrarSugerencias.set(lista.length > 0);
        this.indice.set(0);
      },
      error: () => this.cerrarSugerencias(),
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.mostrarSugerencias()) {
      if (event.key === 'Enter') this.onSearch();
      return;
    }

    const total = this.sugerencias().length;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.indice.update((i) => (i + 1) % total);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.indice.update((i) => (i - 1 + total) % total);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.irAPerfil(this.sugerencias()[this.indice()]);
    } else if (event.key === 'Escape') {
      this.cerrarSugerencias();
    }
  }

  irAPerfil(sugerencia: SugerenciaUsuario): void {
    this.cerrarSugerencias();
    this.isMobileMenuOpen.set(false);
    this.searchQuery = '';

    const yo = this.user()?.gitUsername;
    const esMiPerfil =
      !!yo && yo.toLowerCase() === sugerencia.username.toLowerCase();

    this.router.navigate(
      esMiPerfil ? ['/app/perfil'] : ['/app/perfil', sugerencia.username]
    );
  }

  onSearch(): void {
    const termino = this.searchQuery.trim();
    if (!termino) return;

    const primera = this.sugerencias()[0];
    if (primera) {
      this.irAPerfil(primera);
      return;
    }

    this.isMobileMenuOpen.set(false);
    this.perfilService.searchByFullName(termino).subscribe({
      next: (usuarioEncontrado) => {
        if (!usuarioEncontrado) return;
        if (usuarioEncontrado.gitUsername) {
          this.router.navigate(['/perfil', usuarioEncontrado.gitUsername]);
        } else {
          this.router.navigate(['/perfil', usuarioEncontrado.id]);
        }
      },
      error: () => {
        console.error('Usuario no encontrado con ese nombre');
      },
    });
  }

  private cerrarSugerencias(): void {
    this.mostrarSugerencias.set(false);
    this.sugerencias.set([]);
  }
}

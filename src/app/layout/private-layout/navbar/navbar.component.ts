import { Component, computed, OnInit, inject, signal, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { ResumeService } from '../../../core/services/resume.service';
import {
  RelacionUsuario,
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

  /** Filtro por relación con la red propia; 'Todos' deja ver a cualquier usuario de la app. */
  readonly filtro = signal<'Todos' | RelacionUsuario>('Todos');
  readonly filtros: ('Todos' | RelacionUsuario)[] = ['Todos', 'Sigues', 'Te sigue', 'Sugerido'];

  readonly visibles = computed(() => {
    const lista = this.sugerencias();
    const f = this.filtro();
    return f === 'Todos' ? lista : lista.filter((s) => s.relacion === f);
  });

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
    this.directorio.buscar(termino, 20).subscribe({
      next: (lista) => {
        this.sugerencias.set(lista);
        this.mostrarSugerencias.set(this.visibles().length > 0);
        this.indice.set(0);
      },
      error: () => this.cerrarSugerencias(),
    });
  }

  cambiarFiltro(filtro: 'Todos' | RelacionUsuario): void {
    this.filtro.set(filtro);
    this.indice.set(0);
    this.mostrarSugerencias.set(this.visibles().length > 0);
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.mostrarSugerencias()) {
      if (event.key === 'Enter') this.onSearch();
      return;
    }

    const total = this.visibles().length;
    if (total === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.indice.update((i) => (i + 1) % total);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.indice.update((i) => (i - 1 + total) % total);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.irAPerfil(this.visibles()[this.indice()]);
    } else if (event.key === 'Escape') {
      this.cerrarSugerencias();
    }
  }

  irAPerfil(sugerencia: SugerenciaUsuario): void {
    if (!sugerencia?.username) return;

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

    const primera = this.visibles()[0];
    if (primera) {
      this.irAPerfil(primera);
      return;
    }

    this.isMobileMenuOpen.set(false);
    this.perfilService.searchByFullName(termino).subscribe({
      next: (resultados) => {
        const usuarioEncontrado = resultados?.[0];
        if (!usuarioEncontrado) return;
        this.cerrarSugerencias();
        // /perfil sin /app caía en el layout público y abría mi propio perfil.
        this.router.navigate(['/app/perfil', usuarioEncontrado.gitUsername || usuarioEncontrado.id]);
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

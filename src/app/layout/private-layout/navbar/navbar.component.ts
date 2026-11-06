import { Component, computed, inject, signal, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService } from '../../../core/services/perfil.service';
import {
  RelacionUsuario,
  SugerenciaUsuario,
  UserDirectoryService,
} from '../../../core/services/user-directory.service';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { NotificacionesComponent } from '../notificaciones/notificaciones.component';

@Component({
  selector: 'app-private-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, UserMenuComponent, NotificacionesComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class PrivateNavbarComponent implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private elRef = inject(ElementRef);
  private perfilService = inject(PerfilService);
  private directorio = inject(UserDirectoryService);

  readonly user = this.auth.currentUser;
  searchQuery = '';

  sugerencias = signal<SugerenciaUsuario[]>([]);
  indice = signal(0);
  mostrarSugerencias = signal(false);

  readonly filtro = signal<'Todos' | RelacionUsuario>('Todos');
  readonly filtros: ('Todos' | RelacionUsuario)[] = ['Todos', 'Sigues', 'Te sigue', 'Sugerido'];

  readonly visibles = computed(() => {
    const lista = this.sugerencias();
    const f = this.filtro();
    return f === 'Todos' ? lista : lista.filter((s) => s.relacion === f);
  });

  private timer?: ReturnType<typeof setTimeout>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.cerrarSugerencias();
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

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

  limpiar(campo: HTMLInputElement): void {
    this.searchQuery = '';
    this.cerrarSugerencias();
    campo.focus();
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

    this.perfilService.searchByFullName(termino).subscribe({
      next: (resultados) => {
        const usuarioEncontrado = resultados?.[0];
        if (!usuarioEncontrado) return;
        this.cerrarSugerencias();
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

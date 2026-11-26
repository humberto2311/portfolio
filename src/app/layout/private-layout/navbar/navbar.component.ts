import { Component, computed, inject, signal, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService } from '../../../core/services/perfil.service';
import {
  RelacionUsuario,
  SugerenciaUsuario,
  UserDirectoryService,
} from '../../../core/services/user-directory.service';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { NotificacionesComponent } from '../notificaciones/notificaciones.component';
import { LogoComponent } from '../../../shared/components/logo/logo.component';
import { BusquedaRedService, ResultadoRed } from '../../../core/services/busqueda-red.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { EmpresaService } from '../../../core/services/empresa.service';

interface MenuItem {
  label: string;
  icon: string;
  ruta?: string;
  nota?: string;
  exacto?: boolean;
  /** 'cuenta' = la entrada que alterna entre Modo personal y Modo empresa. */
  accion?: 'mensajes' | 'cuenta';
}

/**
 * La barra superior es solo identidad + búsqueda + acciones (estilo Instagram).
 * Las secciones viven en el riel izquierdo; aquí quedan únicamente las que se
 * necesitan cuando el riel no existe (p. ej. la tarjeta pública).
 */
const MENU_PERSONAL: MenuItem[] = [
  { label: 'Mi panel', icon: 'fa-solid fa-chart-pie', ruta: '/app/panel', nota: 'Tus números' },
  { label: 'Mi perfil', icon: 'fa-solid fa-id-badge', ruta: '/app/perfil', nota: 'Lo que ven los demás' },
  { label: 'Talento', icon: 'fa-solid fa-magnifying-glass', ruta: '/app/talento', nota: 'Buscar empleo' },
  { label: 'Proyectos', icon: 'fa-solid fa-diagram-project', ruta: '/app/proyectos', nota: 'En los que trabajas' },
];

/** Portafolio y enlaces se refuerzan entre sí: enseñar el trabajo y mandarlo con un link. */
const MENU_CV: MenuItem[] = [
  { label: 'Portafolio', icon: 'fa-solid fa-briefcase', ruta: '/app/portafolio', nota: 'Tus trabajos' },
  { label: 'Mis enlaces', icon: 'fa-solid fa-link', ruta: '/app/hub', nota: 'Todo en un link' },
];

const MENU_EMPRESA: MenuItem[] = [
  { label: 'Empresa', icon: 'fa-solid fa-building', ruta: '/app/empresa', exacto: true, nota: 'Lo que ven los demás' },
  { label: 'Mi espacio', icon: 'fa-solid fa-globe', ruta: '/app/empresa/espacio', nota: 'Tu landing' },
  { label: 'Diseño', icon: 'fa-solid fa-pen-ruler', ruta: '/app/empresa/lienzo', nota: 'Armar secciones' },
  { label: 'Mis diseños', icon: 'fa-solid fa-folder-open', ruta: '/app/empresa/disenos', nota: 'Componentes' },
  { label: 'Panel de la empresa', icon: 'fa-solid fa-chart-pie', ruta: '/app/panel', nota: 'Tus números' },
  { label: 'Equipo', icon: 'fa-solid fa-users', ruta: '/app/empresa/ajustes?tab=equipo', nota: 'Personas y permisos' },
];

/** Enlaces del equipo y tarjetas del equipo: una sola entrada. */
const MENU_EQUIPO: MenuItem[] = [
  { label: 'Enlaces del equipo', icon: 'fa-solid fa-link', ruta: '/app/empresa/enlaces', nota: 'Links de cada uno' },
  { label: 'Tarjetas del equipo', icon: 'fa-solid fa-address-card', ruta: '/app/empresa/tarjetas', nota: 'vCards para compartir' },
];

@Component({
  selector: 'app-private-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, UserMenuComponent, NotificacionesComponent, LogoComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class PrivateNavbarComponent implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private elRef = inject(ElementRef);
  private perfilService = inject(PerfilService);
  private directorio = inject(UserDirectoryService);
  private empresas = inject(EmpresaService);
  readonly red = inject(BusquedaRedService);
  readonly mensajes = inject(SidePanelService);

  readonly user = this.auth.currentUser;
  searchQuery = '';

  sugerencias = signal<SugerenciaUsuario[]>([]);
  indice = signal(0);
  mostrarSugerencias = signal(false);
  mostrarRed = signal(false);

  /** Menú principal de la barra superior: en escritorio no se muestra; en móvil es el de hamburguesa. */
  readonly menuAbierto = signal(false);

  /** Buscador a pantalla completa (en móvil la barra solo lleva la lupa). */
  readonly buscadorAbierto = signal(false);

  readonly filtro = signal<'Todos' | RelacionUsuario>('Todos');
  readonly filtros: ('Todos' | RelacionUsuario)[] = ['Todos', 'Por NFC', 'Sigues', 'Te sigue', 'Sugerido'];

  readonly visibles = computed(() => {
    const lista = this.sugerencias();
    const f = this.filtro();
    return f === 'Todos' ? lista : lista.filter((s) => s.relacion === f);
  });

  /** Modo empresa: el menú y el desplegable cambian de contenido. */
  readonly enEmpresa = this.empresas.enModoEmpresa;

  readonly menu = computed<MenuItem[]>(() => (this.enEmpresa() ? MENU_EMPRESA : MENU_PERSONAL));
  readonly menuCv = computed<MenuItem[]>(() => (this.enEmpresa() ? MENU_EQUIPO : MENU_CV));
  readonly tituloCv = computed(() => (this.enEmpresa() ? 'Equipo' : 'Portafolio'));
  readonly notaCv = computed(() =>
    this.enEmpresa() ? 'Enlaces y tarjetas' : 'Tus trabajos y enlaces',
  );
  readonly iconoCv = computed(() => (this.enEmpresa() ? 'fa-solid fa-users' : 'fa-solid fa-briefcase'));

  /** Etiquetas del cambio de cuenta, para el menú de hamburguesa y el menú del avatar. */
  readonly etiquetaCuenta = computed(() =>
    this.enEmpresa()
      ? 'Volver a mi perfil personal'
      : (this.empresas.empresaActual()?.nombre ? `Ir a ${this.empresas.empresaActual()!.nombre}` : 'Ir a mi empresa'),
  );
  readonly iconoCuenta = computed(() => (this.enEmpresa() ? 'fa-solid fa-user' : 'fa-solid fa-building'));

  private timer?: ReturnType<typeof setTimeout>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.cerrarSugerencias();
      this.mostrarRed.set(false);
      this.menuAbierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuAbierto.set(false);
    this.buscadorAbierto.set(false);
    this.cerrarSugerencias();
    this.mostrarRed.set(false);
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  alternarMenu(): void {
    this.menuAbierto.update((v) => !v);
    if (this.menuAbierto()) {
      this.cerrarSugerencias();
      this.mostrarRed.set(false);
    }
  }

  /** En móvil: abre el buscador a pantalla completa y enfoca el campo. */
  abrirBuscador(campo?: HTMLInputElement): void {
    this.buscadorAbierto.set(true);
    this.menuAbierto.set(false);
    setTimeout(() => campo?.focus(), 0);
  }

  cerrarBuscador(campo?: HTMLInputElement): void {
    this.buscadorAbierto.set(false);
    this.searchQuery = '';
    this.cerrarSugerencias();
    this.mostrarRed.set(false);
    this.red.limpiar();
    campo?.blur();
  }

  ir(ruta: string): void {
    this.menuAbierto.set(false);
    this.buscadorAbierto.set(false);
    this.cerrarSugerencias();
    this.mostrarRed.set(false);
    void this.router.navigateByUrl(ruta);
  }

  /** El icono de la barra ya no existe: los chats se abren desde la pastilla. */
  abrirMensajes(): void {
    this.menuAbierto.set(false);
    this.buscadorAbierto.set(false);
    this.mensajes.openContacts();
  }

  importarCv(): void {
    this.menuAbierto.set(false);
    this.buscadorAbierto.set(false);
    this.mensajes.openPdf();
  }

  /**
   * Alterna Modo personal / Modo empresa. Misma lógica que el menú del avatar
   * (UserMenuComponent), para que el botón del móvil haga exactamente lo mismo.
   */
  alternarCuenta(): void {
    this.menuAbierto.set(false);

    if (this.enEmpresa()) {
      this.empresas.salir();
      void this.router.navigate(['/app/perfil']);
      return;
    }

    const destino = this.empresas.empresaActual() ?? this.empresas.listado()[0];
    if (destino) this.empresas.entrar(destino.id);
    void this.router.navigate(['/app/empresa']);
  }

  onSearchInput(valor: string): void {
    this.searchQuery = valor;
    if (this.timer) clearTimeout(this.timer);

    const termino = valor.trim();

    this.red.buscar(termino);
    this.mostrarRed.set(termino.length >= 2);

    if (!termino) {
      this.cerrarSugerencias();
      this.mostrarRed.set(false);
      return;
    }

    this.timer = setTimeout(() => this.buscar(termino), 250);
  }

  irAResultado(resultado: ResultadoRed): void {
    this.cerrarSugerencias();
    this.mostrarRed.set(false);
    this.buscadorAbierto.set(false);
    this.searchQuery = '';
    this.red.ir(resultado);
  }

  limpiar(campo: HTMLInputElement): void {
    this.searchQuery = '';
    this.cerrarSugerencias();
    this.mostrarRed.set(false);
    this.red.limpiar();
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
    if (this.mostrarRed() && this.red.resultados().length && event.key === 'Enter') {
      event.preventDefault();
      this.irAResultado(this.red.resultados()[0]);
      return;
    }

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

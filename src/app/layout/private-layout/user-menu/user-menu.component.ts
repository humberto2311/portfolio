import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { ResumeService } from '../../../core/services/resume.service';
import { TourService } from '../../../core/services/tour.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { esSinImagen } from '../../../features/empresa/espacio/espacio-ui';
import { ConfirmationModalService } from '../../../core/services/confirmation-modal.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { AnimatedButtonDirective } from '../../../shared/directives/animated-button.directive';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, AnimatedButtonDirective],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss']
})
export class UserMenuComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private elRef = inject(ElementRef);
  private perfiles = inject(UserProfileService);
  private resumes = inject(ResumeService);
  private tour = inject(TourService);
  private empresas = inject(EmpresaService);
  private confirmationModal = inject(ConfirmationModalService);
  private panel = inject(SidePanelService);
  private destruir = inject(DestroyRef);
  private oyenteClic = (evento: MouseEvent) => {
    if (!this.elRef.nativeElement.contains(evento.target)) this.menuOpen.set(false);
  };

  readonly user = this.auth.currentUser;
  readonly menuOpen = signal(false);
  readonly avatar = this.perfiles.avatar;
  readonly rol = signal<string>('');
  readonly nativa = Capacitor.isNativePlatform();
  readonly enEmpresa = this.empresas.enModoEmpresa;
  readonly empresaActual = this.empresas.empresaActual;

  /**
   * En modo empresa el disparador muestra el logo de la empresa; en modo personal,
   * la foto de siempre. Mismo criterio que el riel (side-nav), para que la cuenta
   * se reconozca de un vistazo sin leer el nombre.
   */
  readonly fotoCuenta = computed(() => {
    if (!this.enEmpresa()) return this.avatar();
    const logo = (this.empresaActual()?.logoUrl ?? '').trim();
    return !logo || esSinImagen(logo) ? null : logo;
  });

  ngOnInit(): void {
    this.perfiles.cargarMiAvatar();

    // Se registra a mano: la barra vive en varios layouts y el @HostListener
    // dejaba de responder cuando el menú se abre y cierra seguido.
    document.addEventListener('click', this.oyenteClic);
    this.destruir.onDestroy(() => document.removeEventListener('click', this.oyenteClic));

    const usuario = this.user();
    if (!usuario?.id) return;

    this.perfiles.getPerfilCompletoPorId(usuario.id).subscribe({
      next: (perfil) => {
        const rol = (perfil?.role || perfil?.headline || '').trim();

        if (rol && rol.toLowerCase() !== 'user') {
          this.rol.set(rol);
          return;
        }

        this.resumes.getProfileByUserId(usuario.id).subscribe({
          next: (rp) => {
            const headline = (rp?.headline || '').trim();
            if (headline) this.rol.set(headline);
          },
          error: () => {},
        });
      },
      error: () => {},
    });
  }

  toggleMenu() { this.menuOpen.update(v => !v); }

  /** Nombre de la cuenta activa: la empresa cuando se está en modo empresa. */
  nombreCuenta(): string {
    return this.enEmpresa()
      ? (this.empresaActual()?.nombre ?? 'Mi empresa')
      : (this.user()?.fullName ?? 'Mi perfil');
  }

  /** Cambia entre perfil personal y empresa desde el menú de perfil (funciona en móvil). */
  alternarCuenta(): void {
    if (this.enEmpresa()) {
      this.volverAPersonal();
      return;
    }

    this.menuOpen.set(false);

    if (!this.empresas.listado().length) {
      this.empresas.cargarMis().subscribe({
        next: () => this.irAEmpresa(),
        error: () => this.router.navigate(['/app/empresa']),
      });
      return;
    }

    this.irAEmpresa();
  }

  /** Entra a la empresa activa (o a la primera) y navega a su perfil en la red. */
  private irAEmpresa(): void {
    const activa = this.empresaActual();
    const destino = activa ?? this.empresas.listado()[0];

    if (destino) this.empresas.entrar(destino.id);
    this.router.navigate(['/app/empresa']);
  }

  getInitials(): string {
    if (this.enEmpresa()) {
      const nombre = (this.empresaActual()?.nombre ?? '').trim();
      if (!nombre) return 'EM';
      const partes = nombre.split(/\s+/).filter(Boolean);
      if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }

    const name = this.user()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  /** Si el logo no carga, se caen a las iniciales en lugar de dejar el hueco. */
  logoFallido(evento: Event): void {
    const img = evento.target as HTMLImageElement | null;
    if (img) img.style.display = 'none';
  }

  goTo(path: string) {
    this.menuOpen.set(false);
    this.router.navigate([path]);
  }

  /** Antes vivía en el botón flotante de la derecha: ahora es una opción del menú. */
  importarCv(): void {
    this.menuOpen.set(false);
    this.panel.openPdf();
  }

  volverAPersonal() {
    this.menuOpen.set(false);
    this.empresas.salir();
    this.router.navigate(['/app/perfil']);
  }

  abrirGuia() {
    this.menuOpen.set(false);
    this.tour.abrir();
  }

  async logout(): Promise<void> {
    const confirmed = await this.confirmationModal.confirmLogout();
    if (confirmed) {
      this.menuOpen.set(false);
      this.auth.logout();
      this.router.navigate(['/']);
    }
  }
}

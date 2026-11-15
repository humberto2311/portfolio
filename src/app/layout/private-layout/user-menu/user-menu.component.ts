import { Component, inject, signal, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { ResumeService } from '../../../core/services/resume.service';
import { TourService } from '../../../core/services/tour.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { ConfirmationModalService } from '../../../core/services/confirmation-modal.service';
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

  readonly user = this.auth.currentUser;
  readonly menuOpen = signal(false);
  readonly avatar = this.perfiles.avatar;
  readonly rol = signal<string>('');
  readonly nativa = Capacitor.isNativePlatform();
  readonly enEmpresa = this.empresas.enModoEmpresa;
  readonly empresaActual = this.empresas.empresaActual;

  ngOnInit(): void {
    this.perfiles.cargarMiAvatar();

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.menuOpen.set(false);
    }
  }

  getInitials(): string {
    const name = this.user()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  goTo(path: string) {
    this.menuOpen.set(false);
    this.router.navigate([path]);
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

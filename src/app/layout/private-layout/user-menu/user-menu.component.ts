import { Component, inject, signal, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { ResumeService } from '../../../core/services/resume.service';
import { TourService } from '../../../core/services/tour.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
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

  readonly user = this.auth.currentUser;
  readonly menuOpen = signal(false);
  readonly avatar = this.perfiles.avatar;
  readonly rol = signal<string>('');
  readonly nativa = Capacitor.isNativePlatform();

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

  abrirGuia() {
    this.menuOpen.set(false);
    this.tour.abrir();
  }

  logout() {
    this.menuOpen.set(false);
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

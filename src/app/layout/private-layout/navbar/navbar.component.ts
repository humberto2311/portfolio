import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService } from '../../../core/services/perfil.service'; 
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { DropdownMenuComponent } from '../dropdown-menu/dropdown-menu.component';

@Component({
  selector: 'app-private-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, UserMenuComponent, DropdownMenuComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class PrivateNavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private elRef = inject(ElementRef);
  private perfilService = inject(PerfilService); 

  readonly user = this.auth.currentUser;
  searchQuery = '';
  readonly isMobileMenuOpen = signal(false);

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isMobileMenuOpen.set(false);
    }
  }

  onSearch() {
    const term = this.searchQuery.trim();
    if (!term) return;
    this.isMobileMenuOpen.set(false);
    this.perfilService.searchByFullName(term).subscribe({
      next: (usuarioEncontrado) => {
        if (usuarioEncontrado && usuarioEncontrado.gitUsername) {
          this.router.navigate(['/perfil', usuarioEncontrado.gitUsername]);
        } else {
          this.router.navigate(['/perfil', usuarioEncontrado.id]);
        }
      },
      error: () => {
        console.error('Usuario no encontrado con ese nombre');
        // Aquí podrías mostrar un ToastService avisando que no se encontró
      }
    });
  }
}
// src/app/shared/components/navbar/navbar.component.ts
import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModalService } from '../../../core/services/modal.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private modalSvc = inject(ModalService);
  auth = inject(AuthService);

  readonly isScrolled = signal(false);
  readonly isMobileMenuOpen = signal(false);

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMenus() {
    this.isMobileMenuOpen.set(false);
  }

  openLogin(tab: 'login' | 'register' = 'login') {
    this.closeMenus();
    this.modalSvc.openLogin(tab);
  }

  logout() {
    this.closeMenus();
    this.auth.logout();
  }
}
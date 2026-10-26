import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { DropdownMenuComponent } from '../dropdown-menu/dropdown-menu.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, UserMenuComponent, DropdownMenuComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private elRef = inject(ElementRef);

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
    if (this.searchQuery.trim()) {
      this.isMobileMenuOpen.set(false);
      this.router.navigate(['/app/buscar'], { queryParams: { q: this.searchQuery } });
    }
  }
}
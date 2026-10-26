import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss']
})
export class UserMenuComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private elRef = inject(ElementRef);

  readonly user = this.auth.currentUser;
  readonly menuOpen = signal(false);

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
  
  logout() { 
    this.auth.logout(); 
    this.router.navigate(['/']); 
  }
}
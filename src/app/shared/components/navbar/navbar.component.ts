import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  public isMobileMenuOpen: boolean = false;
  public isContactDropdownOpen: boolean = false;

  // Enlaces externos
  public githubUrl: string = 'https://github.com/jonnytedire-web';
  public linkedinUrl: string = 'https://linkedin.com/in/tu-perfil';
  public email: string = 'aacendra@ugpp.gov.co';

  // Métodos para controlar el estado UI
  public toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  public toggleContactDropdown(): void {
    this.isContactDropdownOpen = !this.isContactDropdownOpen;
  }

  public closeMenus(): void {
    this.isMobileMenuOpen = false;
    this.isContactDropdownOpen = false;
  }
}
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../src/app/core/services/auth.service'; // Ajusta la ruta a tu AuthService

// 👇 Importamos AMBOS navbars
import { NavbarComponent } from '../shared/components/navbar/navbar.component'; // Público
import { PrivateNavbarComponent } from './private-layout/navbar/navbar.component'; // Privado (ajusta la ruta)
import { FooterComponent } from '../shared/components/footer/footer.component';
import { LoginModalComponent } from '../shared/components/login-modal/login-modal.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  // 👇 Los agregamos a los imports
  imports: [RouterOutlet, CommonModule, NavbarComponent, PrivateNavbarComponent, FooterComponent, LoginModalComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {

  public authService = inject(AuthService);
}
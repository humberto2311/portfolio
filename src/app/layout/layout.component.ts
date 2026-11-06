import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { TemaService } from '../core/services/tema.service';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { PrivateNavbarComponent } from './private-layout/navbar/navbar.component';
import { FooterComponent } from '../shared/components/footer/footer.component';
import { LoginModalComponent } from '../shared/components/login-modal/login-modal.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent, PrivateNavbarComponent, FooterComponent, LoginModalComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {

  public authService = inject(AuthService);
  private readonly tema = inject(TemaService);

  constructor() {
    effect(() => {
      this.tema.pintar(this.tema.claro() && !this.authService.isAuthenticated());
    });
  }
}

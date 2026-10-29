import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { CarruselComponent } from './shared/components/carrusel/carrusel.component';
import { LoginModalComponent } from '../app/shared/components/login-modal/login-modal.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CarruselComponent, FooterComponent, RouterOutlet, NavbarComponent, LoginModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'portafolio';
}

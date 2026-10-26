import { Component } from '@angular/core';
import { NavbarComponent } from '../shared/components/navbar/navbar.component'; 
import { FooterComponent } from '../shared/components/footer/footer.component';
import { LoginModalComponent } from '../shared/components/login-modal/login-modal.component';
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [NavbarComponent, RouterOutlet, FooterComponent, LoginModalComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {

}

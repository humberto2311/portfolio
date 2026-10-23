import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router'; 
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink,      
    RouterLinkActive
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
// Propiedades públicas accesibles desde la plantilla HTML
  public currentYear: number = new Date().getFullYear();
  public developerName: string = 'Humberto Lozano';
  public location: string = 'Bogotá, Colombia';
  public email: string = 'Humbertojoce@gmail.com';
  
  // Enlaces profesionales
  public githubUrl: string = 'https://github.com/humberto2311?tab=repositories';
  public linkedinUrl: string = 'https://www.linkedin.com/in/humberto-jose-lozano-verbel-363591238';

  // Rutas internas
  public personalInfoRoute: string = '/sobre-mi';
  public resumeRoute: string = '/hoja-de-vida';
  public resumePdfUrl: string = 'assets/docs/HOJADEVIDA-HUMBERTOLOZANOVERBEL.pdf';
}

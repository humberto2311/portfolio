import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';

interface EnlacePie {
  etiqueta: string;
  ruta?: string;
  fragmento?: string;
  href?: string;
  icono?: string;
  externo?: boolean;
}

interface GrupoPie {
  titulo: string;
  enlaces: EnlacePie[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly currentYear: number = new Date().getFullYear();
  readonly developerName: string = 'Humberto Lozano';
  readonly location: string = 'Bogotá, Colombia';
  readonly email: string = 'Humbertojoce@gmail.com';
  readonly githubUrl: string = 'https://github.com/humberto2311?tab=repositories';
  readonly linkedinUrl: string = 'https://www.linkedin.com/in/humberto-jose-lozano-verbel-363591238';
  readonly resumePdfUrl: string = 'assets/docs/HOJADEVIDA-HUMBERTOLOZANOVERBEL.pdf';

  readonly grupos: GrupoPie[] = [
    {
      titulo: 'La app',
      enlaces: [
        { etiqueta: 'Qué es', ruta: '/', fragmento: 'que-es' },
        { etiqueta: 'Cómo funciona', ruta: '/', fragmento: 'como-funciona' },
        { etiqueta: 'Versiones', ruta: '/', fragmento: 'versiones' },
        { etiqueta: 'Políticas de datos', ruta: '/politicas' }
      ]
    },
    {
      titulo: 'Mi trabajo',
      enlaces: [
        { etiqueta: 'Sobre el creador', ruta: '/perfil/humberto2311' },
        { etiqueta: 'Hoja de vida', ruta: '/informacion-personal' },
        { etiqueta: 'Proyectos y código', ruta: '/proyectos' },
        { etiqueta: 'Hoja de vida en PDF', href: this.resumePdfUrl }
      ]
    },
    {
      titulo: 'Conectemos',
      enlaces: [
        { etiqueta: 'GitHub', href: this.githubUrl, icono: 'fa-brands fa-github', externo: true },
        { etiqueta: 'LinkedIn', href: this.linkedinUrl, icono: 'fa-brands fa-linkedin', externo: true },
        { etiqueta: 'Escríbeme', href: `mailto:${this.email}`, icono: 'fa-regular fa-envelope' }
      ]
    }
  ];
}

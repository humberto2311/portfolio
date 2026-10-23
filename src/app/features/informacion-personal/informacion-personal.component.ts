import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DatoPersonal {
  etiqueta: string;
  valor: string;
  icono: string;
}

interface Habilidad {
  nombre: string;
  nivel: number; // 0 a 100
}

@Component({
  selector: 'app-informacion-personal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './informacion-personal.component.html',
  styleUrls: ['./informacion-personal.component.scss']
})
export class InformacionPersonalComponent {

  // Datos básicos del perfil
  public nombre: string = 'Humberto Lozano';
  public cargo: string = 'Desarrollador Full Stack';
  public descripcion: string = 'Apasionado por crear soluciones web modernas, escalables y con excelente experiencia de usuario. Experiencia en Angular, Node.js y bases de datos.';

  // Información de contacto / personal
  public datosPersonales: DatoPersonal[] = [
    { etiqueta: 'Email',       valor: 'aacendra@ugpp.gov.co',                    icono: '✉️' },
    { etiqueta: 'Ubicación',   valor: 'Bogotá, Colombia',                        icono: '📍' },
    { etiqueta: 'Teléfono',    valor: '+57 300 000 0000',                        icono: '📞' },
    { etiqueta: 'GitHub',      valor: 'github.com/jonnytedire-web',              icono: '💻' },
    { etiqueta: 'LinkedIn',    valor: 'linkedin.com/in/tu-perfil',               icono: '💼' }
  ];

  // Habilidades con nivel
  public habilidades: Habilidad[] = [
    { nombre: 'Angular',    nivel: 90 },
    { nombre: 'TypeScript', nivel: 85 },
    { nombre: 'Node.js',    nivel: 80 },
    { nombre: 'HTML / CSS', nivel: 95 },
    { nombre: 'SQL',        nivel: 75 }
  ];

  // Experiencia laboral
  public experiencia = [
    {
      cargo: 'Desarrollador Full Stack',
      empresa: 'UGPP',
      periodo: '2022 - Presente',
      descripcion: 'Desarrollo de aplicaciones internas con Angular y Node.js.'
    },
    {
      cargo: 'Desarrollador Frontend',
      empresa: 'Freelance',
      periodo: '2020 - 2022',
      descripcion: 'Creación de sitios web y aplicaciones SPA para clientes.'
    }
  ];
}
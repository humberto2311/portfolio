import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-informacion-personal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './informacion-personal.component.html',
  styleUrls: ['./informacion-personal.component.scss']
})
export class InformacionPersonalComponent {
  
  public nombre = 'Humberto Lozano Verbel';
  public rol = 'Ingeniero de Sistemas | Desarrollador Backend';

  // Rutas de tu Hoja de Vida
  public resumeRoute: string = '/hoja-de-vida';
  public resumePdfUrl: string = 'assets/docs/HOJADEVIDA-HUMBERTOLOZANOVERBEL.pdf';

  // Texto exacto basado en tu perfil del PDF
  public perfilProfesional = 'Ingeniero de Sistemas y estudiante de Postgrado en Ingeniería de Software con más de 3 años de experiencia en desarrollo backend enterprise con Java y Spring Boot. Especializado en Arquitectura Hexagonal, diseño de APIs RESTful de alto rendimiento, procesamiento multihilo y tuning de bases de datos relacionales. Con base full-stack: experiencia en Angular y JavaScript y formación en desarrollo full-stack a través de MinTIC.';

  public metricas = [
    { titulo: 'Experiencia', valor: '3+ Años', tendencia: 'Enterprise Backend', icono: '💼', color: '#27c93f' },
    { titulo: 'Especialidad', valor: 'Java / Spring', tendencia: 'Arq. Hexagonal', icono: '⚙️', color: '#ffbd2e' },
    { titulo: 'Pruebas Unitarias', valor: '> 80%', tendencia: 'JUnit 5 / Mockito', icono: '🧪', color: '#ff5f56' }
  ];

  // Formación resumida de tu HV
  public formacion = [
    { titulo: 'Postgrado en Ingeniería de Software', institucion: 'Universidad Tecnológica de Bolívar', year: '2025 - Presente' },
    { titulo: 'Ingeniería de Sistemas', institucion: 'Tecnológico Comfenalco', year: '2024' },
    { titulo: 'Programador Full-Stack', institucion: 'MinTIC', year: '2024' },
    { titulo: 'Programador Java', institucion: 'Alura Latam', year: '2024' }
  ];

  // NUEVO: Experiencia simplificada (Solo empresa, cargo y fecha)
  public experiencia = [
    {
      empresa: 'Security Cast S.A.S',
      cargo: 'Desarrollador Backend',
      fecha: '2023 - Presente'
    },
    {
      empresa: 'LYC Soluciones Empresariales',
      cargo: 'Desarrollador Backend',
      fecha: '2023'
    },
    {
      empresa: 'Zabud',
      cargo: 'Pasante Desarrollo de Software',
      fecha: 'Feb - Ago 2023'
    }
  ];

  public tecnologias = [
    { nombre: 'Java', icono: 'devicon-java-plain colored' },
    { nombre: 'Spring Boot', icono: 'devicon-spring-plain colored' },
    { nombre: 'Angular', icono: 'devicon-angularjs-plain colored' },
    { nombre: 'TypeScript', icono: 'devicon-typescript-plain colored' },
    { nombre: 'Oracle / SQL', icono: 'devicon-oracle-original colored' },
    { nombre: 'PostgreSQL', icono: 'devicon-postgresql-plain colored' },
    { nombre: 'Docker', icono: 'devicon-docker-plain colored' },
    { nombre: 'Git', icono: 'devicon-git-plain colored' },
    { nombre: 'JUnit 5', icono: 'devicon-java-plain' }, 
    { nombre: 'JavaScript', icono: 'devicon-javascript-plain colored' }
  ];

  public contacto = [
    { icono: '✉️', texto: 'humbertojoc@gmail.com' },
    { icono: '📞', texto: '(+57) 311 840 6566' },
    { icono: '📍', texto: 'Bogotá, Colombia' },
    { icono: '💻', texto: 'github.com/humberto2311' }
  ];

    // Función para hacer scroll suave a las secciones
  scrollTo(id: string, event: Event) {
    event.preventDefault(); // Evita que la página se recargue
    const element = document.getElementById(id);
    if (element) {
      // Hacemos el scroll calculando la posición del elemento
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
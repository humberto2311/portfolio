import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Proyecto } from '../models/proyecto';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {

  // Datos de prueba (Simulando lo que te devolverá tu backend)
  private proyectosMock: Proyecto[] = [
    {
      id: 1,
      nombre: 'Proyecto Angular',
      tag: '#ANGULAR',
      imagenUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop',
      descripcion: 'Aplicación web desarrollada con Angular. Arquitectura de componentes y enrutamiento.',
      ramaPrincipal: 'main',
      urlRepositorio: 'https://github.com/humberto2311/proyecto-angular',
      tecnologias: ['Angular', 'TypeScript', 'SCSS'],
      codigoEjemplo: `// app.routes.ts\nexport const routes: Routes = [\n  { path: '', component: HomeComponent }\n];`
    },
    {
      id: 2,
      nombre: 'Prueba Técnica',
      tag: '#BACKEND',
      imagenUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=600&auto=format&fit=crop',
      descripcion: 'Solución a prueba técnica. Implementación de lógica de negocio y endpoints.',
      ramaPrincipal: 'main',
      urlRepositorio: 'https://github.com/humberto2311/prueba-tecnica',
      tecnologias: ['Node.js', 'Express', 'MongoDB'],
      codigoEjemplo: `// server.js\nconst express = require('express');\nconst app = express();`
    }
  ];

  constructor() { }

  /**
   * Obtiene todos los proyectos.
   * Actualmente devuelve datos de prueba (Mock).
   * Cuando tengas el backend, cambia esto por:
   * return this.http.get<Proyecto[]>('https://tu-api.com/proyectos');
   */
  getProyectos(): Observable<Proyecto[]> {
    // Simulamos un retraso de 1 segundo (como si fuera una petición real)
    return of(this.proyectosMock).pipe(delay(1000));
  }

  /**
   * Obtiene un proyecto por su ID.
   * (Útil para cuando entras al detalle de un proyecto)
   */
  getProyectoById(id: number): Observable<Proyecto | undefined> {
    const proyecto = this.proyectosMock.find(p => p.id === id);
    return of(proyecto);
  }
}
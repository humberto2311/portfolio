import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Proyecto } from '../models/proyecto';
import { environment } from '../../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private readonly API_URL = `${environment.apiUrl}/api/resume`;

  getProyectos(): Observable<Proyecto[]> {
    // Si estamos en el servidor (prerender), devolvemos un array vacío
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    // Si estamos en el navegador, hacemos la petición real
    return this.http.get<Proyecto[]>(this.API_URL);
  }
}
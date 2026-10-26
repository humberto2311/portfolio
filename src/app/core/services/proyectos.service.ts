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

  private readonly API_URL = `${environment.apiUrl}/api/resume`;

  getProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.API_URL);
  }
}
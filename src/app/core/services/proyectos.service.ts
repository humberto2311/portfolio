import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proyecto } from '../models/proyecto';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {

  private http = inject(HttpClient);

 private readonly rawEnvApiUrl = (import.meta.env?.['API_URL'] || import.meta.env?.['VITE_API_URL'] || '').trim();
  private readonly API_URL = (this.rawEnvApiUrl || 'http://localhost:8081') + '/api/resume';

  getProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.API_URL);
  }

 
}
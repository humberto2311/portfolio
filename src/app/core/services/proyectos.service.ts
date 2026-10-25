import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proyecto } from '../models/proyecto';
import { environment } from '../../../../src/environments/environments'; // ajusta la ruta

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
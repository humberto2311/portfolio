import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proyecto } from '../models/proyecto';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {

  private http = inject(HttpClient);
  
  // Asegúrate de que el puerto sea el correcto (8081 o el que estés usando)
  private readonly API_URL = 'http://localhost:8081/api/cards';

  getProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.API_URL);
  }

 
}
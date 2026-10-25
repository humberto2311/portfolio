import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ResumeProfile, ResumeSection, ResumeItem } from '../models/resume.model';
import { environment } from '../../../../src/environments/environments'; // ajusta la ruta

@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/resume`;

  // 1. Obtener el perfil (usaremos el ID 1 que creaste en Postman)
  getProfile(profileId: number): Observable<ResumeProfile> {
    return this.http.get<ResumeProfile>(`${this.API_URL}/profiles/${profileId}`);
  }

  // 2. Obtener las secciones del perfil
  getSections(profileId: number): Observable<ResumeSection[]> {
    return this.http.get<ResumeSection[]>(`${this.API_URL}/sections/profile/${profileId}`);
  }

  // 3. Obtener los ítems de una sección
  getItemsBySection(sectionId: number): Observable<ResumeItem[]> {
    return this.http.get<ResumeItem[]>(`${this.API_URL}/items/section/${sectionId}`);
  }

  // 🔥 4. MAGIA: Unir todo (Perfil + Secciones + Ítems)
  getFullResume(profileId: number): Observable<{ profile: ResumeProfile, sections: ResumeSection[] }> {
    return this.getProfile(profileId).pipe(
      switchMap(profile => {
        return this.getSections(profileId).pipe(
          switchMap(sections => {
            if (sections.length === 0) return [ { profile, sections: [] } ];
            
            // Hacemos las peticiones de los ítems para cada sección en paralelo
            const sectionRequests = sections.map(section => 
              this.getItemsBySection(section.id!).pipe(
                map(items => {
                  section.items = items;
                  return section;
                })
              )
            );
            
            return forkJoin(sectionRequests).pipe(
              map(sectionsWithItems => ({ profile, sections: sectionsWithItems }))
            );
          })
        );
      })
    );
  }
}
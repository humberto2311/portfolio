import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ResumeProfile, ResumeSection, ResumeItem } from '../models/resume.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ResumeService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/resume`;

  getProfile(profileId: number): Observable<ResumeProfile> {
    return this.http.get<ResumeProfile>(`${this.API_URL}/profiles/${profileId}`);
  }

  getProfileByFullName(fullName: string): Observable<ResumeProfile> {
    const safeName = fullName.trim().replace(/\s+/g, '-');
    return this.http.get<ResumeProfile>(`${this.API_URL}/profiles/name/${safeName}`);
  }

  getProfileByUserId(userId: string): Observable<ResumeProfile> {
    return this.http.get<ResumeProfile>(`${this.API_URL}/profiles/user/${userId}`);
  }

  getProfileBySlug(slug: string): Observable<ResumeProfile> {
    return this.http.get<ResumeProfile>(`${this.API_URL}/profiles/slug/${slug}`);
  }

  getSections(profileId: number): Observable<ResumeSection[]> {
    return this.http.get<ResumeSection[]>(`${this.API_URL}/sections/profile/${profileId}`);
  }

  getItemsBySection(sectionId: number): Observable<ResumeItem[]> {
    return this.http.get<ResumeItem[]>(`${this.API_URL}/items/section/${sectionId}`);
  }

  getFullResume(profileId: number): Observable<{ profile: ResumeProfile; sections: ResumeSection[] }> {
    return this.getProfile(profileId).pipe(
      switchMap(profile =>
        this.getSections(profileId).pipe(
          switchMap(sections => {
            if (sections.length === 0) return [{ profile, sections: [] }];

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
        )
      )
    );
  }
}
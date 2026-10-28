import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResumeProfile } from '../models/resume.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ResumeSaveService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/resume`;

 
  ensureProfile(userId: string): Observable<ResumeProfile> {
    return this.http.post<ResumeProfile>(
      `${this.API_URL}/profiles/ensure/${userId}`, {}
    );
  }

 
  createProfile(payload: {
    userId: string;
    fullName: string;
    headline?: string;
    summary?: string;
    email?: string;
    phone?: string;
    location?: string;
    githubUrl?: string;
  }): Observable<ResumeProfile> {
    return this.http.post<ResumeProfile>(`${this.API_URL}/profiles`, payload);
  }

  
  createWithDefaults(payload: {
    userId: string;
    fullName: string;
  }): Observable<ResumeProfile> {
    return this.http.post<ResumeProfile>(
      `${this.API_URL}/profiles/with-defaults`, payload
    );
  }

 
  updateProfile(
    profileId: number,
    payload: Partial<ResumeProfile> & { userProfileId?: string }
  ): Observable<ResumeProfile> {
    return this.http.put<ResumeProfile>(
      `${this.API_URL}/profiles/${profileId}`, payload
    );
  }


  publishProfile(profileId: number): Observable<ResumeProfile> {
    return this.http.post<ResumeProfile>(
      `${this.API_URL}/profiles/${profileId}/publish`, {}
    );
  }


  unpublishProfile(profileId: number): Observable<ResumeProfile> {
    return this.http.post<ResumeProfile>(
      `${this.API_URL}/profiles/${profileId}/unpublish`, {}
    );
  }

  cloneProfile(profileId: number, newUserId: string): Observable<ResumeProfile> {
    return this.http.post<ResumeProfile>(
      `${this.API_URL}/profiles/${profileId}/clone/${newUserId}`, {}
    );
  }

  deleteProfile(profileId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/profiles/${profileId}`);
  }
}
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'; // Ajusta tu ruta de environment

export interface PdfImportResult {
  success: boolean;
  message: string;
  profileId: number;
  suspiciousContent: boolean;
  warnings?: string[];
  sectionsCreated?: number;
  itemsCreated?: number;
}

@Injectable({ providedIn: 'root' })
export class PdfService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/resume/pdf`; 

  importPdf(file: File): Observable<PdfImportResult> {
    const formData = new FormData();
    formData.append('file', file);


    const token = localStorage.getItem('token'); 
    
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post<PdfImportResult>(`${this.apiUrl}/import`, formData, { headers });
  }
}
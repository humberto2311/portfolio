import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PdfImportResult {
  success: boolean;
  message: string;
  profileId: number;
  suspiciousContent: boolean;
  warnings?: string[];
  sectionsCreated?: number;
  itemsCreated?: number;
}

export interface PdfJobStatus {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: PdfImportResult;
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class PdfService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/resume/pdf`;

  importPdf(file: File): Observable<{ jobId: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ jobId: string; message: string }>(`${this.apiUrl}/import`, formData);
  }

  getStatus(jobId: string): Observable<PdfJobStatus> {
    return this.http.get<PdfJobStatus>(`${this.apiUrl}/status/${jobId}`);
  }
}

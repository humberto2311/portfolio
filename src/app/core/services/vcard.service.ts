import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { VCardPayload } from '../models/vcard.model';

@Injectable({ providedIn: 'root' })
export class VcardService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/vcard`;

  /** Mi tarjeta. Devuelve null si todavía no existe (el backend responde 204). */
  miTarjeta(): Observable<VCardPayload | null> {
    return this.http.get<VCardPayload | null>(`${this.base}/me`).pipe(
      map((r) => r ?? null)
    );
  }

  guardar(dto: VCardPayload): Observable<VCardPayload> {
    return this.http.put<VCardPayload>(`${this.base}/me`, dto);
  }

  tarjetaDe(userId: string): Observable<VCardPayload | null> {
    return this.http.get<VCardPayload>(`${this.base}/usuario/${userId}`).pipe(
      map((r) => r ?? null)
    );
  }

  descargarVcf(): Observable<Blob> {
    return this.http.get(`${this.base}/me/vcf`, { responseType: 'blob' });
  }

  /** .vcf de una tarjeta pública (página del QR / NFC). */
  vcfPublico(userId: string): Observable<Blob> {
    return this.http.get(`${this.base}/usuario/${userId}/vcf`, { responseType: 'blob' });
  }

  vacia(): VCardPayload {
    return {
      plantilla: 'PERSONAL',
      nombre: '',
      puesto: '',
      empresa: '',
      telefono: '',
      email: '',
      web: '',
      linkedin: '',
      notas: '',
      campos: [],
    };
  }

  sinDatos(): Observable<null> {
    return of(null);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PlantillaVcard, VCardPayload } from '../models/vcard.model';

@Injectable({ providedIn: 'root' })
export class VcardService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/vcard`;

  /** Todas mis tarjetas. */
  listar(): Observable<VCardPayload[]> {
    return this.http.get<VCardPayload[]>(`${this.base}/mis-tarjetas`);
  }

  /** Mi tarjeta por defecto (la primera o la marcada porDefecto). */
  miTarjeta(): Observable<VCardPayload | null> {
    return this.http
      .get<VCardPayload | null>(`${this.base}/me`)
      .pipe(map((r) => r ?? null));
  }

  /** Mi tarjeta por slug (personal, profesional, emergencia…). */
  miTarjetaPorSlug(slug: string): Observable<VCardPayload | null> {
    return this.http
      .get<VCardPayload | null>(`${this.base}/me/${slug}`)
      .pipe(map((r) => r ?? null));
  }

  /** Crear o actualizar tarjeta. El slug identifica la tarjeta. */
  guardar(dto: VCardPayload): Observable<VCardPayload> {
    return this.http.put<VCardPayload>(`${this.base}/me`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/me/${id}`);
  }

  /** Público: cualquier tarjeta por slug (accesible siempre, sin importar active). */
  tarjetaPorSlug(userId: string, slug: string): Observable<VCardPayload | null> {
    return this.http
      .get<VCardPayload>(`${this.base}/usuario/${userId}/${slug}`)
      .pipe(map((r) => r ?? null));
  }

  /** Público: tarjeta por defecto. */
  tarjetaPorDefecto(userId: string): Observable<VCardPayload | null> {
    return this.http
      .get<VCardPayload>(`${this.base}/usuario/${userId}`)
      .pipe(map((r) => r ?? null));
  }

  /** Descarga el .vcf de la tarjeta por defecto (mía). */
  descargarVcf(slug?: string): Observable<Blob> {
    const url = slug
      ? `${this.base}/me/${slug}/vcf`
      : `${this.base}/me/vcf`;
    return this.http.get(url, { responseType: 'blob' });
  }

  /** Descarga el .vcf público de una tarjeta concreta. */
  vcfPublico(userId: string, slug: string): Observable<Blob> {
    return this.http.get(`${this.base}/usuario/${userId}/${slug}/vcf`, {
      responseType: 'blob',
    });
  }

  vacia(plantilla: PlantillaVcard = 'PERSONAL', slug?: string): VCardPayload {
    return {
      slug: slug ?? plantilla.toLowerCase(),
      plantilla,
      porDefecto: false,
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
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  IntegracionPos,
  OrdenPos,
  PaginaOrdenes,
  ProductoPos,
  ResumenPos
} from '../models/pos.model';

@Injectable({
  providedIn: 'root'
})
export class PosService {

  private http = inject(HttpClient);

  private base(empresaId: string): string {
    return `${environment.apiUrl}/api/pos/${empresaId}`;
  }

  productos(empresaId: string): Observable<ProductoPos[]> {
    return this.http.get<ProductoPos[]>(`${this.base(empresaId)}/productos`);
  }

  crearProducto(empresaId: string, producto: Partial<ProductoPos>): Observable<ProductoPos> {
    return this.http.post<ProductoPos>(`${this.base(empresaId)}/productos`, producto);
  }

  editarProducto(empresaId: string, id: string, producto: Partial<ProductoPos>): Observable<ProductoPos> {
    return this.http.put<ProductoPos>(`${this.base(empresaId)}/productos/${id}`, producto);
  }

  borrarProducto(empresaId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(empresaId)}/productos/${id}`);
  }

  ordenes(empresaId: string, estado?: string, desde?: string, hasta?: string, pagina = 0): Observable<PaginaOrdenes> {
    let params = new HttpParams().set('page', String(pagina));
    if (estado) params = params.set('estado', estado);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);

    return this.http.get<PaginaOrdenes>(`${this.base(empresaId)}/ordenes`, { params });
  }

  crearOrden(empresaId: string, cuerpo: unknown): Observable<OrdenPos> {
    return this.http.post<OrdenPos>(`${this.base(empresaId)}/ordenes`, cuerpo);
  }

  pagar(empresaId: string, ordenId: string): Observable<OrdenPos> {
    return this.http.post<OrdenPos>(`${this.base(empresaId)}/ordenes/${ordenId}/pagar`, {});
  }

  cancelar(empresaId: string, ordenId: string): Observable<OrdenPos> {
    return this.http.post<OrdenPos>(`${this.base(empresaId)}/ordenes/${ordenId}/cancelar`, {});
  }

  resumen(empresaId: string, desde?: string, hasta?: string): Observable<ResumenPos> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ResumenPos>(`${this.base(empresaId)}/resumen`, { params });
  }

  integracion(empresaId: string): Observable<IntegracionPos> {
    return this.http.get<IntegracionPos>(`${this.base(empresaId)}/integracion`);
  }

  rotarToken(empresaId: string): Observable<{ token: string; url: string; pista: string }> {
    return this.http.post<{ token: string; url: string; pista: string }>(
      `${this.base(empresaId)}/integracion/rotar`, {});
  }
}

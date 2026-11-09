import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  CatalogoEmpresa,
  ComponenteLienzo,
  DisenoEmpresa,
  DocumentoEmpresa,
  DocumentoEmpresaForm,
  Empresa,
  EmpresaForm,
  EmpresaPublica,
  InvitarMiembro,
  MiembroEmpresa,
  PanelEmpresa,
  ActualizarMiembro,
} from '../models/empresa.model';

const CLAVE = 'n-soft.empresa-activa';

function hayAlmacenamiento(): boolean {
  return typeof localStorage !== 'undefined';
}

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly raiz = `${environment.apiUrl}/api/empresas`;

  readonly listado = signal<Empresa[]>([]);
  readonly panel = signal<PanelEmpresa | null>(null);
  readonly publica = signal<EmpresaPublica | null>(null);
  readonly catalogo = signal<CatalogoEmpresa | null>(null);
  readonly activaId = signal<string | null>(null);
  readonly cargandoMis = signal(false);

  readonly enModoEmpresa = computed(() => this.activaId() !== null);
  readonly empresaActual = computed(() => this.listado().find((e) => e.id === this.activaId()) ?? null);
  readonly acceso = computed(() => this.panel()?.acceso ?? null);

  private peticionMis: Observable<Empresa[]> | null = null;
  private usuarioActual: string | null = null;

  constructor() {
    this.usuarioActual = this.auth.currentUser()?.id ?? null;
    effect(() => {
      const usuarioId = this.auth.currentUser()?.id ?? null;
      if (usuarioId === this.usuarioActual) return;
      this.usuarioActual = usuarioId;
      this.reiniciar();
    }, { allowSignalWrites: true });
  }

  cargarCatalogo(forzar = false): Observable<CatalogoEmpresa | null> {
    const guardado = this.catalogo();
    if (guardado && !forzar) return of(guardado);

    return this.http.get<CatalogoEmpresa>(`${this.raiz}/catalogo`).pipe(
      catchError(() => of(null)),
      tap((datos) => this.catalogo.set(datos)),
    );
  }

  cargarMis(forzar = false): Observable<Empresa[]> {
    if (this.peticionMis && !forzar) return this.peticionMis;

    this.cargandoMis.set(true);

    const peticion = this.http.get<Empresa[]>(`${this.raiz}/mis`).pipe(
      catchError(() => {
        this.peticionMis = null;
        return of([]);
      }),
      tap((listado) => {
        this.listado.set(listado ?? []);
        this.activaId.set(this.empresaGuardada(this.listado()));
      }),
      finalize(() => this.cargandoMis.set(false)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.peticionMis = peticion;
    return peticion;
  }

  cargarPanel(empresaId: string): Observable<PanelEmpresa | null> {
    return this.http.get<PanelEmpresa>(`${this.raiz}/${empresaId}`).pipe(
      catchError(() => of(null)),
      tap((panel) => this.panel.set(panel)),
    );
  }

  cargarPublica(slug: string): Observable<EmpresaPublica | null> {
    return this.http.get<EmpresaPublica>(`${this.raiz}/public/${slug}`).pipe(
      catchError(() => of(null)),
      tap((datos) => this.publica.set(datos)),
    );
  }

  crear(form: EmpresaForm): Observable<Empresa> {
    return this.http.post<Empresa>(this.raiz, form);
  }

  actualizar(empresaId: string, form: EmpresaForm): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.raiz}/${empresaId}`, form);
  }

  borrar(empresaId: string): Observable<void> {
    return this.http.delete<void>(`${this.raiz}/${empresaId}`).pipe(
      tap(() => {
        if (this.activaId() === empresaId) this.salir();
        this.peticionMis = null;
      }),
    );
  }

  publicar(empresaId: string, publicada: boolean): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.raiz}/${empresaId}/publicar?publicada=${publicada}`, {});
  }

  slugLibre(slug: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.raiz}/public/slug/${slug}`).pipe(catchError(() => of(false)));
  }

  invitar(empresaId: string, datos: InvitarMiembro): Observable<MiembroEmpresa> {
    return this.http.post<MiembroEmpresa>(`${this.raiz}/${empresaId}/miembros`, datos);
  }

  cambiarRol(empresaId: string, miembroId: string, datos: ActualizarMiembro): Observable<MiembroEmpresa> {
    return this.http.put<MiembroEmpresa>(`${this.raiz}/${empresaId}/miembros/${miembroId}`, datos);
  }

  quitar(empresaId: string, miembroId: string): Observable<void> {
    return this.http.delete<void>(`${this.raiz}/${empresaId}/miembros/${miembroId}`);
  }

  subirDocumento(empresaId: string, datos: DocumentoEmpresaForm): Observable<DocumentoEmpresa> {
    return this.http.post<DocumentoEmpresa>(`${this.raiz}/${empresaId}/documentos`, datos);
  }

  borrarDocumento(empresaId: string, documentoId: string): Observable<void> {
    return this.http.delete<void>(`${this.raiz}/${empresaId}/documentos/${documentoId}`);
  }

  guardarLienzo(empresaId: string, componentes: ComponenteLienzo[]): Observable<ComponenteLienzo[]> {
    return this.http.put<ComponenteLienzo[]>(`${this.raiz}/${empresaId}/componentes`, { componentes });
  }

  crearComponente(empresaId: string, componente: ComponenteLienzo): Observable<ComponenteLienzo> {
    return this.http.post<ComponenteLienzo>(`${this.raiz}/${empresaId}/componentes`, componente);
  }

  moverComponente(empresaId: string, componente: ComponenteLienzo): Observable<ComponenteLienzo> {
    return this.http.patch<ComponenteLienzo>(
      `${this.raiz}/${empresaId}/componentes/${componente.id}`,
      componente,
    );
  }

  borrarComponente(empresaId: string, componenteId: string): Observable<void> {
    return this.http.delete<void>(`${this.raiz}/${empresaId}/componentes/${componenteId}`);
  }

  guardarDiseno(empresaId: string, diseno: DisenoEmpresa): Observable<DisenoEmpresa> {
    return this.http.put<DisenoEmpresa>(`${this.raiz}/${empresaId}/diseno`, diseno);
  }

  entrar(empresaId: string): void {
    this.activaId.set(empresaId);
    this.panel.set(null);
    this.publica.set(null);
    this.escribir(empresaId);
  }

  salir(): void {
    this.activaId.set(null);
    this.panel.set(null);
    this.publica.set(null);
    if (hayAlmacenamiento()) localStorage.removeItem(CLAVE);
  }

  refrescarListado(): void {
    this.peticionMis = null;
  }

  private reiniciar(): void {
    this.peticionMis = null;
    this.listado.set([]);
    this.panel.set(null);
    this.publica.set(null);
    this.activaId.set(null);
    if (hayAlmacenamiento()) localStorage.removeItem(CLAVE);
  }

  private empresaGuardada(mias: Empresa[]): string | null {
    if (!hayAlmacenamiento()) return null;

    const guardado = localStorage.getItem(CLAVE);
    const [dueño, id] = (guardado ?? '|').split('|');

    if (!id || dueño !== this.auth.currentUser()?.id) return null;

    return mias.some((empresa) => empresa.id === id) ? id : null;
  }

  private escribir(empresaId: string): void {
    if (!hayAlmacenamiento()) return;

    const dueño = this.auth.currentUser()?.id;
    if (dueño) localStorage.setItem(CLAVE, `${dueño}|${empresaId}`);
  }
}

export function mensajeDeError(err: any, porDefecto: string): string {
  const cuerpo = err?.error;
  if (Array.isArray(cuerpo?.errores) && cuerpo.errores.length) return cuerpo.errores.join(' ');
  return cuerpo?.error ?? cuerpo?.message ?? err?.message ?? porDefecto;
}

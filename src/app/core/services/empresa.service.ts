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
  DisenoGuardadoCarpeta,
  DisenoLienzo,
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

  // Diseños del lienzo (menú, tarjeta, catálogo...), cada uno con su estado público.
  listarDisenos(empresaId: string): Observable<DisenoLienzo[]> {
    return this.http
      .get<DisenoLienzo[]>(`${this.raiz}/${empresaId}/disenos`)
      .pipe(catchError(() => of([])));
  }

  crearDiseno(empresaId: string, datos: Partial<DisenoLienzo>): Observable<DisenoLienzo> {
    return this.http.post<DisenoLienzo>(`${this.raiz}/${empresaId}/disenos`, datos);
  }

  actualizarDiseno(empresaId: string, disenoId: string, datos: Partial<DisenoLienzo>): Observable<DisenoLienzo> {
    return this.http.put<DisenoLienzo>(`${this.raiz}/${empresaId}/disenos/${disenoId}`, datos);
  }

  publicarDiseno(empresaId: string, disenoId: string, publico: boolean): Observable<DisenoLienzo> {
    return this.http.patch<DisenoLienzo>(
      `${this.raiz}/${empresaId}/disenos/${disenoId}/publicar?publico=${publico}`,
      {},
    );
  }

  borrarDiseno(empresaId: string, disenoId: string): Observable<void> {
    return this.http.delete<void>(`${this.raiz}/${empresaId}/disenos/${disenoId}`);
  }

  piezasDiseno(empresaId: string, disenoId: string): Observable<ComponenteLienzo[]> {
    return this.http
      .get<ComponenteLienzo[]>(`${this.raiz}/${empresaId}/disenos/${disenoId}/componentes`)
      .pipe(catchError(() => of([])));
  }

  // Alto del lienzo general de la empresa (sin diseño con nombre).
  altoLienzo(empresaId: string): Observable<number> {
    return this.http
      .get<number>(`${this.raiz}/${empresaId}/disenos/alto`)
      .pipe(catchError(() => of(900)));
  }

  guardarAltoLienzo(empresaId: string, alto: number): Observable<number> {
    return this.http.put<number>(`${this.raiz}/${empresaId}/disenos/alto`, alto);
  }

  /** Vista previa con sesión: funciona aunque el diseño siga privado. */
  disenoPrivado(slug: string): Observable<DisenoLienzo | null> {
    return this.http
      .get<DisenoLienzo>(`${this.raiz}/disenos/slug/${slug}`)
      .pipe(catchError(() => of(null)));
  }

  disenoPublico(slug: string): Observable<DisenoLienzo | null> {
    return this.http
      .get<DisenoLienzo>(`${this.raiz}/public/diseno/${slug}`)
      .pipe(catchError(() => of(null)));
  }

  /** Carpeta personal: todos los componentes que creé, con su enlace. */
  misDisenos(): Observable<DisenoGuardadoCarpeta[]> {
    return this.http
      .get<DisenoGuardadoCarpeta[]>(`${this.raiz}/mis-disenos`)
      .pipe(catchError(() => of([])));
  }

  miDiseno(componenteId: string): Observable<DisenoGuardadoCarpeta | null> {
    return this.http
      .get<DisenoGuardadoCarpeta>(`${this.raiz}/mis-disenos/${componenteId}`)
      .pipe(catchError(() => of(null)));
  }

  cargarPiezaPublica(slug: string, componenteId: string): Observable<ComponenteLienzo | null> {
    return this.http
      .get<ComponenteLienzo>(`${this.raiz}/public/${slug}/componentes/${componenteId}`)
      .pipe(catchError(() => of(null)));
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

  guardarLienzo(
    empresaId: string,
    componentes: ComponenteLienzo[],
    disenoId?: string | null,
  ): Observable<ComponenteLienzo[]> {
    return this.http.put<ComponenteLienzo[]>(`${this.raiz}/${empresaId}/componentes`, {
      componentes,
      disenoId: disenoId ?? null,
    });
  }

  crearComponente(
    empresaId: string,
    componente: ComponenteLienzo,
    disenoId?: string | null,
  ): Observable<ComponenteLienzo> {
    return this.http.post<ComponenteLienzo>(`${this.raiz}/${empresaId}/componentes`, {
      ...componente,
      disenoId: disenoId ?? componente.disenoId ?? null,
    });
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

  parchearEmpresa(empresa: Empresa): void {
    this.listado.update((lista) =>
      lista.map((item) => (item.id === empresa.id ? { ...item, ...empresa } : item)),
    );
    this.panel.update((panel) =>
      panel && panel.empresa.id === empresa.id ? { ...panel, empresa } : panel,
    );
  }

  parchearPanel(cambio: Partial<PanelEmpresa>): void {
    this.panel.update((panel) => (panel ? { ...panel, ...cambio } : panel));
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

import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SugerenciaUsuario, UserDirectoryService } from './user-directory.service';
import { EmpresaService } from './empresa.service';

export interface ResultadoRed {
  tipo: 'persona' | 'empresa';
  id: string;
  nombre: string;
  usuario?: string;
  iniciales: string;
  avatarUrl?: string | null;
  detalle?: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class BusquedaRedService {
  private http = inject(HttpClient);
  private directorio = inject(UserDirectoryService);
  private empresas = inject(EmpresaService);
  private router = inject(Router);

  readonly resultados = signal<ResultadoRed[]>([]);
  readonly buscando = signal(false);
  readonly termino = signal('');
  readonly abierta = signal(false);

  buscar(texto: string): void {
    const limpio = texto.trim();
    this.termino.set(limpio);

    if (limpio.length < 2) {
      this.resultados.set([]);
      this.buscando.set(false);
      return;
    }

    this.buscando.set(true);

    forkJoin({
      personas: this.directorio.buscar(limpio, 12).pipe(catchError(() => of([]))),
      empresas: this.buscarEmpresas(limpio).pipe(catchError(() => of([]))),
    }).subscribe(({ personas, empresas }) => {
      this.resultados.set([
        ...empresas.map((empresa) => this.deEmpresa(empresa)),
        ...personas.map((persona) => this.dePersona(persona)),
      ]);
      this.buscando.set(false);
      this.abierta.set(true);
    });
  }

  limpiar(): void {
    this.resultados.set([]);
    this.termino.set('');
    this.buscando.set(false);
    this.abierta.set(false);
  }

  ir(resultado: ResultadoRed): void {
    this.limpiar();
    void this.router.navigateByUrl(resultado.url);
  }

  private buscarEmpresas(texto: string): Observable<{ id: string; nombre: string; slug: string; logoUrl?: string | null; eslogan?: string | null; tipo?: string | null }[]> {
    return this.http
      .get<any[]>(`${environment.apiUrl}/api/empresas/buscar`, { params: new HttpParams().set('q', texto) })
      .pipe(
        map((lista) => (Array.isArray(lista) ? lista : [])),
        catchError(() => this.empresas.buscarPublicas(texto)),
      );
  }

  private deEmpresa(empresa: { id: string; nombre: string; slug: string; logoUrl?: string | null; eslogan?: string | null; tipo?: string | null }): ResultadoRed {
    return {
      tipo: 'empresa',
      id: empresa.id,
      nombre: empresa.nombre,
      iniciales: this.iniciales(empresa.nombre),
      avatarUrl: empresa.logoUrl ?? null,
      detalle: empresa.eslogan ?? empresa.tipo ?? 'Empresa',
      url: `/empresa/${empresa.slug}`,
    };
  }

  private dePersona(persona: SugerenciaUsuario): ResultadoRed {
    return {
      tipo: 'persona',
      id: persona.username,
      nombre: persona.nombre,
      usuario: persona.username,
      iniciales: persona.iniciales,
      avatarUrl: persona.avatarUrl ?? null,
      detalle: persona.relacion,
      url: `/app/perfil/${persona.username}`,
    };
  }

  private iniciales(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';

    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }
}

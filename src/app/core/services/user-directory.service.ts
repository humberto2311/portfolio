import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { ConexionDto, UserProfileDto } from '../models/perfil.model';
import { ConnectionService } from './connection.service';
import { PerfilService } from './perfil.service';
import { AuthService } from './auth.service';

export type RelacionUsuario = 'Sigues' | 'Te sigue' | 'Sugerido';

export interface SugerenciaUsuario {
  username: string;
  nombre: string;
  iniciales: string;
  avatarUrl?: string;
  relacion: RelacionUsuario;
}

/**
 * Directorio de personas para autocompletar con @ y para el buscador del navbar.
 * Ordena las sugerencias en tres capas: a quién sigo, quién me sigue y el resto.
 */
@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  private connectionService = inject(ConnectionService);
  private perfilService = inject(PerfilService);
  private authService = inject(AuthService);

  private red: SugerenciaUsuario[] = [];
  private carga$?: Observable<SugerenciaUsuario[]>;

  /** Carga (una sola vez) seguidos + seguidores + toda la red. */
  cargarRed(): Observable<SugerenciaUsuario[]> {
    if (this.red.length > 0) return of(this.red);
    if (this.carga$) return this.carga$;

    this.carga$ = forkJoin({
      siguiendo: this.connectionService
        .getMyFollowing()
        .pipe(catchError(() => of([] as ConexionDto[]))),
      seguidores: this.connectionService
        .getMyFollowers()
        .pipe(catchError(() => of([] as ConexionDto[]))),
      todos: this.perfilService.listarUsuarios(),
    }).pipe(
      map(({ siguiendo, seguidores, todos }) =>
        this.construir(siguiendo, seguidores, todos)
      ),
      catchError(() => of([] as SugerenciaUsuario[])),
      tap((lista) => {
        this.red = lista;
        this.carga$ = undefined;
      }),
      shareReplay(1)
    );

    return this.carga$;
  }

  /** Fuerza a recargar (por si cambió a quién sigue). */
  recargar(): void {
    this.red = [];
    this.carga$ = undefined;
  }

  /**
   * Busca por username o nombre. El término puede venir con o sin @.
   * Si no hay coincidencias locales, cae al buscador del backend.
   */
  buscar(termino: string, limite = 8): Observable<SugerenciaUsuario[]> {
    const query = termino.replace(/^@/, '').toLowerCase().trim();

    return this.cargarRed().pipe(
      switchMap((red) => {
        const locales = this.filtrar(red, query).slice(0, limite);
        if (locales.length > 0 || query.length < 2) return of(locales);
        return this.buscarRemoto(query, limite);
      })
    );
  }

  private construir(
    siguiendo: ConexionDto[],
    seguidores: ConexionDto[],
    todos: UserProfileDto[]
  ): SugerenciaUsuario[] {
    const mapa = new Map<string, SugerenciaUsuario>();

    const agregar = (s: SugerenciaUsuario) => {
      const clave = s.username.toLowerCase();
      if (!clave || mapa.has(clave) || this.esMiUsuario(s.username)) return;
      mapa.set(clave, s);
    };

    for (const c of siguiendo ?? []) {
      agregar({
        username: c.usernameContact || '',
        nombre: c.nombreContact || c.usernameContact || 'Usuario',
        iniciales: this.iniciales(c.nombreContact || c.usernameContact || '?'),
        avatarUrl: c.avatarUrl,
        relacion: 'Sigues',
      });
    }

    // En los seguidores la otra persona viene en los campos "user".
    for (const c of seguidores ?? []) {
      agregar({
        username: c.usernameUser || '',
        nombre: c.nombreUser || c.usernameUser || 'Usuario',
        iniciales: this.iniciales(c.nombreUser || c.usernameUser || '?'),
        avatarUrl: c.avatarUrl,
        relacion: 'Te sigue',
      });
    }

    for (const u of todos ?? []) {
      if (!u.gitUsername) continue;
      agregar({
        username: u.gitUsername,
        nombre: u.fullName || u.gitUsername,
        iniciales: this.iniciales(u.fullName || u.gitUsername),
        relacion: 'Sugerido',
      });
    }

    return Array.from(mapa.values());
  }

  private filtrar(red: SugerenciaUsuario[], query: string): SugerenciaUsuario[] {
    const puntaje = (s: SugerenciaUsuario): number => {
      const usuario = s.username.toLowerCase();
      const nombre = s.nombre.toLowerCase();
      if (!query) return 0;
      if (usuario.startsWith(query)) return 0;
      if (usuario.includes(query)) return 1;
      if (nombre.startsWith(query)) return 2;
      if (nombre.includes(query)) return 3;
      return -1;
    };

    const prioridad: Record<RelacionUsuario, number> = {
      'Sigues': 0,
      'Te sigue': 1,
      'Sugerido': 2,
    };

    return red
      .filter((s) => puntaje(s) >= 0)
      .sort(
        (a, b) =>
          puntaje(a) - puntaje(b) ||
          prioridad[a.relacion] - prioridad[b.relacion]
      );
  }

  private buscarRemoto(
    query: string,
    limite: number
  ): Observable<SugerenciaUsuario[]> {
    return this.perfilService.buscarPersonas(query).pipe(
      map((personas) =>
        (personas ?? [])
          .filter((p) => !!p.gitUsername && !this.esYo(p))
          .slice(0, limite)
          .map<SugerenciaUsuario>((p) => ({
            username: p.gitUsername as string,
            nombre: p.fullName || (p.gitUsername as string),
            iniciales: this.iniciales(p.fullName || p.gitUsername || '?'),
            relacion: 'Sugerido',
          }))
      ),
      catchError(() => of([] as SugerenciaUsuario[]))
    );
  }

  private esMiUsuario(username: string): boolean {
    const yo = this.authService.currentUser();
    return (
      !!yo?.gitUsername &&
      yo.gitUsername.toLowerCase() === username.toLowerCase()
    );
  }

  private esYo(persona: UserProfileDto): boolean {
    const yo = this.authService.currentUser();
    if (!yo) return false;
    return (
      String(persona.id) === String(yo.id) ||
      (!!persona.email && persona.email === yo.email) ||
      (!!persona.gitUsername &&
        !!yo.gitUsername &&
        persona.gitUsername.toLowerCase() === yo.gitUsername.toLowerCase())
    );
  }

  private iniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }
}

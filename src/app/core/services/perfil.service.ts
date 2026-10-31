import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, throwError, switchMap, map, forkJoin } from 'rxjs';
import { PerfilData, Publicacion, PostDto, UserProfileDto } from '../models/perfil.model';
import { AuthService } from './auth.service';
import { PostService } from './post.service';
import { LikeService } from './like.service';
import { CommentService } from './comment.service';
import { ShareService } from './share.service';
import { ResumeService } from './resume.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private likeService = inject(LikeService);
  private commentService = inject(CommentService);
  private shareService = inject(ShareService);
  private resumeService = inject(ResumeService);

  private readonly API_URL = `${environment.apiUrl}/api/users`;

  perfil = signal<PerfilData | null>(null);
  publicaciones = signal<Publicacion[]>([]);
  cargando = signal<boolean>(false);

  /**
   * Lista para pintar: si un post viene con descripción de compartido se
   * muestran DOS tarjetas (la del compartido y la del original).
   */
  publicacionesVisibles = computed<Publicacion[]>(() => {
    const salida: Publicacion[] = [];

    for (const p of this.publicaciones()) {
      if (p.descripcionCompartido) {
        salida.push({ ...p, uid: 'share-' + (p.shareId ?? p.id) });
        salida.push({
          ...p,
          uid: 'orig-' + p.id,
          descripcionCompartido: undefined,
          shareId: undefined,
          shareSharedById: undefined,
        });
      } else {
        salida.push({ ...p, uid: p.id });
      }
    }

    return salida;
  });

  // ====== PERFIL ======
  cargarPerfil(username?: string | null): Observable<PerfilData | null> {
    this.cargando.set(true);
    this.perfil.set(null);

    // Acepta username o el UUID del perfil (así funciona el clic en el avatar/nombre).
    const esId =
      !!username &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);

    const url = !username
      ? `${this.API_URL}/me/perfil-completo`
      : esId
        ? `${this.API_URL}/perfil-completo/${username}`
        : `${this.API_URL}/perfil-completo/username/${encodeURIComponent(username)}`;

    return this.http.get<any>(url).pipe(
      tap((data) => {
        if (data) {
          this.perfil.set(this.mapearPerfil(data));
          this.completarRolConCv();
        }
        this.cargando.set(false);
      }),
      catchError((err) => {
        this.cargando.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Si el rol social está vacío o es genérico, se usa el titular que quedó
   * guardado en la hoja de vida (así el header no muestra "User").
   */
  private completarRolConCv(): void {
    const perfil = this.perfil();
    if (!perfil?.id) return;

    const generico = ['', 'user', 'usuario', 'desarrollador'].includes(
      (perfil.rol ?? '').trim().toLowerCase()
    );
    if (!generico) return;

    this.resumeService.getProfileByUserId(perfil.id).subscribe({
      next: (rp) => {
        const headline = (rp?.headline ?? '').trim();
        if (!headline) return;
        this.perfil.update((p) => (p ? { ...p, rol: headline } : p));
      },
      error: () => {
        /* sin hoja de vida: se queda el rol actual */
      },
    });
  }

  // ====== PUBLICACIONES ======
  cargarPublicaciones(profileId: string, page = 0, size = 10): void {
    this.postService.feed(profileId, page, size).subscribe({
      next: (pageRes) => {
        const mapped = pageRes.content.map((p) => this.mapPostToPublicacion(p));
        this.publicaciones.set(mapped);
      },
      error: (err) => console.error('Error cargando feed', err),
    });
  }

  /**
   * Crea una publicación en el perfil que se está viendo.
   * Si el perfil es de otra persona, el backend la deja PENDING hasta que
   * el dueño la acepte, así que no se agrega al feed local.
   * Las menciones @usuario del texto se envían como solicitud a esa persona.
   */
  crearPublicacion(
    texto: string,
    imagen?: string
  ): Observable<{ pendiente: boolean; destino: string; compartidosCon: number }> {
    const destino = this.perfil();
    const miId = String(this.authService.currentUser()?.id ?? '');
    const esAjeno = !!destino?.id && String(destino.id) !== miId;

    const req = {
      content: texto,
      imageUrl: imagen,
      targetProfileId: destino?.id,
    };

    return this.postService.create(req).pipe(
      switchMap((post) => {
        if (!esAjeno) {
          this.publicaciones.update((list) => [
            this.mapPostToPublicacion(post),
            ...list,
          ]);
        }

        return this.compartirMenciones(post.id, texto).pipe(
          map((compartidosCon) => ({
            pendiente: esAjeno,
            destino: destino?.nombre || 'ese perfil',
            compartidosCon,
          }))
        );
      })
    );
  }

  /** Envía una solicitud de compartido a cada @usuario válido del texto. */
  private compartirMenciones(postId: string, texto: string): Observable<number> {
    const menciones = this.extraerMenciones(texto);
    if (menciones.length === 0) return of(0);

    const miId = String(this.authService.currentUser()?.id ?? '');

    const peticiones = menciones.map((username) =>
      this.buscarPersonas('@' + username).pipe(
        map((lista) => lista[0] ?? null),
        catchError(() => of(null)),
        switchMap((persona) => {
          if (!persona) return of(null);
          return this.resolverPerfilId(persona).pipe(
            switchMap((perfilId) =>
              String(perfilId) === miId
                ? of(null)
                : this.shareService.share(postId, perfilId)
            ),
            catchError(() => of(null))
          );
        }),
        catchError(() => of(null))
      )
    );

    return forkJoin(peticiones).pipe(
      map((res) => res.filter((r) => !!r).length)
    );
  }

  private extraerMenciones(texto: string): string[] {
    const re = /@([\w.\-]+)/g;
    const unicas = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(texto)) !== null) {
      unicas.add(m[1]);
    }
    return Array.from(unicas);
  }

  toggleLike(postId: string): void {
    this.likeService.toggle(postId).subscribe({
      next: ({ liked, likesCount }) => {
        this.publicaciones.update((list) =>
          list.map((p) =>
            String(p.id) === String(postId)
              ? { ...p, liked, likes: likesCount }
              : p
          )
        );
      },
    });
  }

  agregarComentario(postId: string, texto: string): void {
    this.commentService.create(postId, texto).subscribe({
      next: (c) => {
        const autor = c.author?.fullName?.trim() || this.nombreUsuarioActual();
        this.publicaciones.update((list) =>
          list.map((p) =>
            String(p.id) === String(postId)
              ? {
                  ...p,
                  comentarios: [
                    ...p.comentarios,
                    {
                      id: c.id,
                      autor,
                      iniciales:
                        c.author?.initials?.trim() || this.generarIniciales(autor),
                      autorId: c.author?.id,
                      autorUsername: c.author?.gitUsername || undefined,
                      autorAvatar: this.avatarDelAutor(c.author?.id),
                      texto: c.content,
                    },
                  ],
                }
              : p
          )
        );
      },
      error: (err) => console.error('Error agregando comentario', err),
    });
  }

  // ====== MAPPERS ======
  private mapPostToPublicacion(p: PostDto): Publicacion {
    const autor = p.author?.fullName?.trim() || this.nombreUsuarioActual();
    return {
      id: p.id,
      autor,
      // El backend ya envía las iniciales; si faltan, se calculan del nombre.
      iniciales: p.author?.initials?.trim() || this.generarIniciales(autor),
      autorId: p.author?.id,
      autorUsername: p.author?.gitUsername || undefined,
      autorAvatar: this.avatarDelAutor(p.author?.id),
      tiempo: this.tiempoRelativo(p.createdAt),
      texto: p.content,
      imagen: p.imageUrl,
      likes: p.likesCount ?? 0,
      compartidos: p.sharesCount ?? 0,
      comentarios: [],
      liked: p.likedByMe,
      descripcionCompartido: p.shareMessage?.trim() || undefined,
      shareId: p.shareId,
      shareSharedById: p.shareSharedById,
    };
  }

  private nombreUsuarioActual(): string {
    return this.authService.currentUser()?.fullName?.trim() || 'Usuario';
  }

  /**
   * AuthorDto no incluye foto: si el autor es el usuario/perfil actual,
   * usamos su avatarUrl del perfil para el círculo.
   */
  private avatarDelAutor(authorId?: string): string | undefined {
    if (!authorId) return undefined;
    const perfil = this.perfil();
    const usuario = this.authService.currentUser();
    const esElMismo =
      String(perfil?.id ?? '') === String(authorId) ||
      String(usuario?.id ?? '') === String(authorId);
    return esElMismo ? perfil?.avatarUrl : undefined;
  }

  private tiempoRelativo(iso: string): string {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  }

  private mapearPerfil(data: any): PerfilData {
    return {
      id: data.id || '',
      nombre: data.fullName || 'Sin nombre',
      rol: data.role?.trim() || data.headline?.trim() || 'User',
      estado: data.state?.trim() || 'DISPONIBLE',
      iniciales: this.generarIniciales(data.fullName || '?'),
      bio: data.shortBio || 'Sin biografía.',
      contacto: {
        email: data.email || '',
        ubicacion: data.ubicacion || '',
        github: data.gitUsername ? `github.com/${data.gitUsername}` : '',
      },
      experiencia: Array.isArray(data.experiencia) ? data.experiencia : [],
      estudios: Array.isArray(data.estudios) ? data.estudios : [],
      pilaTecnologica: Array.isArray(data.pilaTecnologica) ? data.pilaTecnologica : [],
      proyectos: [],
      fotos: Array.isArray(data.fotos) ? data.fotos : [],
      contactos: Array.isArray(data.contactos) ? data.contactos : [],
      coverUrl: data.coverUrl || undefined,
      avatarUrl: data.avatarUrl || undefined,
    };
  }

  private generarIniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }
  

  searchByFullName(fullName: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/search?q=${fullName}`);
  }

  // ====== COMPARTIR PUBLICACIONES ======

  /**
   * Busca personas para compartirles un post.
   * Con "@usuario" resuelve directo por gitUsername; si no, busca por nombre.
   * El endpoint puede devolver un objeto o un arreglo, así que se normaliza.
   */
  buscarPersonas(termino: string): Observable<UserProfileDto[]> {
    const texto = termino.trim();
    if (!texto) return of([]);

    const esUsuario = texto.startsWith('@');
    const consulta = texto.replace(/^@/, '').trim();
    if (!consulta) return of([]);

    const normalizar = (res: any): UserProfileDto[] =>
      Array.isArray(res) ? res : res?.id || res?.fullName ? [res] : [];

    if (esUsuario) {
      return this.http
        .get<any>(`${this.API_URL}/${encodeURIComponent(consulta)}`)
        .pipe(map(normalizar), catchError(() => of([])));
    }

    return this.http
      .get<any>(`${this.API_URL}/search`, { params: { q: consulta } })
      .pipe(map(normalizar), catchError(() => of([])));
  }

  /** Todos los perfiles registrados (para el autocompletado de @). */
  listarUsuarios(): Observable<UserProfileDto[]> {
    return this.http.get<any>(this.API_URL).pipe(
      map((res) => (Array.isArray(res) ? res : [])),
      catchError(() => of([]))
    );
  }

  /**
   * El share necesita el id del PERFIL destino, no el del usuario.
   * Si la persona tiene gitUsername se pide su perfil completo para obtener ese id.
   */
  resolverPerfilId(persona: UserProfileDto): Observable<string> {
    if (!persona.gitUsername) return of(persona.id);

    return this.http
      .get<any>(
        `${this.API_URL}/perfil-completo/username/${encodeURIComponent(persona.gitUsername)}`
      )
      .pipe(
        map((perfil) => perfil?.id || persona.id),
        catchError(() => of(persona.id))
      );
  }

  /** Agrega al feed local un post que otro usuario compartió y aceptamos. */
  agregarPublicacionRecibida(p: PostDto): void {
    this.publicaciones.update((list) => {
      if (list.some((x) => String(x.id) === String(p.id))) return list;
      return [this.mapPostToPublicacion(p), ...list];
    });
  }

  /**
   * Edita (o borra con null) la descripción del compartido y refresca
   * la tarjeta en memoria.
   */
  actualizarDescripcionCompartido(
    shareId: string,
    postId: string,
    texto: string | null
  ): Observable<void> {
    return this.shareService.actualizarMensaje(shareId, texto).pipe(
      map(() => {
        this.publicaciones.update((list) =>
          list.map((p) =>
            String(p.id) === String(postId)
              ? { ...p, descripcionCompartido: texto?.trim() || undefined }
              : p
          )
        );
      })
    );
  }

  /** Muestra de inmediato una publicación ya cargada (ej. al compartirla en mi perfil). */
  agregarPublicacionExistente(p: Publicacion): void {
    this.publicaciones.update((list) => {
      const indice = list.findIndex((x) => String(x.id) === String(p.id));

      // Si ya estaba, se actualiza con la descripción del compartido
      // (así el feed puede mostrar el compartido y el original).
      if (indice >= 0) {
        const copia = [...list];
        copia[indice] = { ...copia[indice], ...p };
        return copia;
      }

      return [p, ...list];
    });
  }

  /** Sube el contador de compartidos de un post visible. */
  marcarCompartido(postId: string): void {
    this.publicaciones.update((list) =>
      list.map((p) =>
        String(p.id) === String(postId)
          ? { ...p, compartidos: (p.compartidos ?? 0) + 1 }
          : p
      )
    );
  }

  editarPublicacion(postId: string, nuevoTexto: string): void {
    this.postService.update(postId, nuevoTexto).subscribe({
      next: (postActualizado) => {
        // Actualizamos la lista reactiva de publicaciones en memoria
        this.publicaciones.update((list) =>
          list.map((p) =>
            String(p.id) === String(postId)
              ? { ...p, texto: postActualizado.content }
              : p
          )
        );
      },
      error: (err) => console.error('Error al editar post', err),
    });
  }
borrarPublicacion(postId: string): void {
  this.postService.delete(postId).subscribe({
    next: () => {
      // Filtramos la lista para quitar el post borrado
      this.publicaciones.update(list => 
        list.filter(p => String(p.id) !== String(postId))
      );
    },
    error: (err) => console.error('Error al borrar post', err)
  });
}
}
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { Publicacion, UserProfileDto } from '../../../../core/models/perfil.model';
import { PerfilService } from '../../../../core/services/perfil.service';
import { ShareService } from '../../../../core/services/share.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  SugerenciaUsuario,
  UserDirectoryService,
} from '../../../../core/services/user-directory.service';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './share-modal.component.html',
  styleUrls: ['./share-modal.component.scss'],
})
export class ShareModalComponent implements OnInit {
  @Input({ required: true }) post!: Publicacion;
  @Output() cerrado = new EventEmitter<void>();

  @ViewChild('descripcion') descripcionRef?: ElementRef<HTMLTextAreaElement>;

  private perfilService = inject(PerfilService);
  private shareService = inject(ShareService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private directorio = inject(UserDirectoryService);

  texto = '';
  enviando = signal(false);
  error = signal<string | null>(null);

  sugerencias = signal<SugerenciaUsuario[]>([]);
  indice = signal(0);
  abiertoSugerencias = signal(false);

  private tokenInicio = -1;

  ngOnInit(): void {
    // Precalienta seguidos + seguidores + red mientras el usuario escribe.
    this.directorio.cargarRed().subscribe();
  }

  // ====== AUTOCOMPLETADO CON @ ======

  onInput(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    this.texto = el.value;

    const caret = el.selectionStart ?? el.value.length;
    const antes = el.value.slice(0, caret);
    const match = /(?:^|[\s(])@([\w.\-]*)$/.exec(antes);

    if (!match) {
      this.cerrarSugerencias();
      return;
    }

    this.tokenInicio = caret - match[1].length - 1;
    this.indice.set(0);
    this.buscarSugerencias(match[1]);
  }

  private buscarSugerencias(query: string): void {
    this.directorio.buscar(query, 8).subscribe({
      next: (lista) => {
        this.sugerencias.set(lista);
        this.abiertoSugerencias.set(lista.length > 0);
      },
      error: () => this.cerrarSugerencias(),
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.abiertoSugerencias()) return;
    const total = this.sugerencias().length;
    if (total === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.indice.update((i) => (i + 1) % total);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.indice.update((i) => (i - 1 + total) % total);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.elegir(this.sugerencias()[this.indice()]);
    } else if (event.key === 'Escape') {
      this.cerrarSugerencias();
    }
  }

  elegir(sugerencia: SugerenciaUsuario): void {
    if (this.tokenInicio < 0) return;

    const antes = this.texto.slice(0, this.tokenInicio);
    const resto = this.texto
      .slice(this.tokenInicio)
      .replace(/^@[\w.\-]*/, '')
      .replace(/^\s+/, '');
    const insertado = `@${sugerencia.username} `;
    this.texto = antes + insertado + resto;

    const posicion = (antes + insertado).length;
    this.cerrarSugerencias();

    setTimeout(() => {
      const el = this.descripcionRef?.nativeElement;
      if (el) {
        el.focus();
        el.setSelectionRange(posicion, posicion);
      }
    });
  }

  private cerrarSugerencias(): void {
    this.abiertoSugerencias.set(false);
    this.sugerencias.set([]);
    this.tokenInicio = -1;
  }

  // ====== MENCIONES ======

  menciones(): string[] {
    const re = /@([\w.\-]+)/g;
    const unicas = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.texto)) !== null) {
      unicas.add(m[1]);
    }
    return Array.from(unicas);
  }

  // ====== ENVIAR ======

  enviar(): void {
    if (this.enviando()) return;

    this.enviando.set(true);
    this.error.set(null);

    const usuarios = this.menciones();
    const mensaje = this.texto.trim() || undefined;

    if (usuarios.length === 0) {
      this.compartirEnMiPerfil(mensaje);
      return;
    }

    // Resuelve cada @usuario; los que no existen se ignoran para no romper el share.
    const resoluciones = usuarios.map((username) =>
      this.perfilService.buscarPersonas('@' + username).pipe(
        map((lista) => lista[0] ?? null),
        catchError(() => of(null))
      )
    );

    forkJoin(resoluciones)
      .pipe(
        switchMap((personas) => {
          const validas = personas.filter((p): p is UserProfileDto => !!p);

          if (validas.length === 0) {
            // Ninguna mención existe: se comparte en el perfil propio.
            return this.enviarAMiPerfil(mensaje).pipe(map(() => 0));
          }

          const peticiones = validas.map((persona) =>
            this.perfilService.resolverPerfilId(persona).pipe(
              switchMap((perfilId) =>
                this.shareService.share(this.post.id, perfilId, mensaje)
              )
            )
          );

          return forkJoin(peticiones).pipe(map(() => validas.length));
        })
      )
      .subscribe({
        next: (cantidad) => {
          if (cantidad === 0) {
            this.terminar('Publicación compartida en tu perfil');
            return;
          }
          const aviso =
            cantidad === 1
              ? `Solicitud enviada a @${usuarios[0]}: debe aceptarla`
              : `Solicitudes enviadas a ${cantidad} personas`;
          this.terminar(aviso);
        },
        error: (err) => this.fallar(err),
      });
  }

  private compartirEnMiPerfil(mensaje?: string): void {
    this.enviarAMiPerfil(mensaje).subscribe({
      next: () => this.terminar('Publicación compartida en tu perfil'),
      error: (err) => this.fallar(err),
    });
  }

  private enviarAMiPerfil(mensaje?: string): Observable<unknown> {
    const miId = this.miPerfilId();
    if (!miId) {
      return throwError(() => new Error('No se pudo identificar tu perfil'));
    }
    return this.shareService.share(this.post.id, miId, mensaje).pipe(
      tap(() => this.agregarLocalmente(mensaje))
    );
  }

  /** Refleja el compartido en el muro actual sin recargar. */
  private agregarLocalmente(mensaje?: string): void {
    this.perfilService.agregarPublicacionExistente({
      ...this.post,
      descripcionCompartido: mensaje ?? this.post.descripcionCompartido,
    });
    this.perfilService.marcarCompartido(this.post.id);
  }

  private terminar(mensaje: string): void {
    this.enviando.set(false);
    this.toast.show(mensaje);
    this.cerrado.emit();
  }

  private fallar(err: any): void {
    this.enviando.set(false);
    this.error.set(
      err?.error?.message ||
        err?.error?.error ||
        err?.message ||
        'No se pudo compartir la publicación'
    );
  }

  private miPerfilId(): string | null {
    const usuario = this.authService.currentUser();
    if (usuario?.id) return String(usuario.id);
    return this.perfilService.perfil()?.id ?? null;
  }

  cerrar(): void {
    this.cerrado.emit();
  }
}

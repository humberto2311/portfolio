import { Injectable, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ResumeService } from './resume.service';
import { ResumeProfile } from '../models/resume.model';

/**
 * Datos reales de la hoja de vida del usuario para el chat de "Buscar empleo":
 * su perfil, sus secciones (con ítems) y el enlace a la hoja de vida.
 * Todo sale de los endpoints que ya existen de CV.
 */
@Injectable({ providedIn: 'root' })
export class CvUsuarioService {
  private auth = inject(AuthService);
  private resume = inject(ResumeService);

  private readonly usuarioId = computed(() => this.auth.currentUser()?.id ?? null);

  private readonly cv = toSignal(
    toObservable(this.usuarioId).pipe(
      switchMap((id) =>
        id ? this.resume.getProfileByUserId(id) : of(null as ResumeProfile | null),
      ),
      map((profile) => profile ?? null),
      catchError(() => of(null)),
    ),
    { initialValue: null as ResumeProfile | null },
  );

  perfil(): ResumeProfile | null {
    return this.cv();
  }

  /** Enlace directo a la hoja de vida para verla y descargarla en PDF. */
  enlaceHojaDeVida(): string {
    return '/app/informacion-personal';
  }
}

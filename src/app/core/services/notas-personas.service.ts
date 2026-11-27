import { Injectable, inject, signal } from '@angular/core';
import { PerfilService } from './perfil.service';

/**
 * Notas vigentes de otras personas, pedidas una sola vez por persona y
 * guardadas en memoria. La nota ya viene en el perfil; esto solo la cachea
 * para pintarla encima del avatar sin pedir el perfil entero cada vez.
 */
@Injectable({ providedIn: 'root' })
export class NotasPersonasService {

  private perfiles = inject(PerfilService);

  private readonly notas = signal<Record<string, string>>({});
  private readonly pedidas = new Set<string>();

  /** La nota ya conocida, o '' si todavía no llegó. */
  nota(usuarioId: string | null | undefined): string {
    if (!usuarioId) return '';

    return this.notas()[usuarioId] ?? '';
  }

  /** Pide la nota de esa persona si no se ha pedido antes. */
  pedir(usuarioId: string | null | undefined): void {
    if (!usuarioId || this.pedidas.has(usuarioId)) return;

    this.pedidas.add(usuarioId);
    this.perfiles.leerPerfil(usuarioId).subscribe((perfil) => {
      const nota = perfil?.nota?.trim();
      if (!nota) return;

      this.notas.update((mapa) => ({ ...mapa, [usuarioId]: nota }));
    });
  }

  /** Pide varias de golpe, sin repetir ninguna. */
  pedirVarias(ids: Array<string | null | undefined>): void {
    for (const id of ids) this.pedir(id);
  }
}

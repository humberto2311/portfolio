import { Injectable, signal } from '@angular/core';

const CLAVE = 'nfc-soft.rail-colapsado';

function hayAlmacenamiento(): boolean {
  return typeof localStorage !== 'undefined';
}

/**
 * El riel arranca en miniatura y se abre al acercar el ratón (estilo Instagram).
 * El hover NO toca localStorage: solo el botón de plegar guarda la preferencia.
 */
@Injectable({ providedIn: 'root' })
export class RailStateService {
  readonly colapsado = signal<boolean>(true);

  /** Abre el riel (hover o clic en la hamburguesa). */
  expandir(): void {
    if (!this.colapsado()) return;
    this.colapsado.set(false);
  }

  /** Vuelve a la miniatura al alejar el ratón. */
  contraer(): void {
    if (this.colapsado()) return;
    this.colapsado.set(true);
  }

  alternar(): void {
    const siguiente = !this.colapsado();
    this.colapsado.set(siguiente);
    this.guardar(siguiente);
  }

  private guardar(colapsado: boolean): void {
    if (!hayAlmacenamiento()) return;
    try {
      localStorage.setItem(CLAVE, colapsado ? '1' : '0');
    } catch {
      /* modo privado o cuota llena: no pasa nada */
    }
  }
}

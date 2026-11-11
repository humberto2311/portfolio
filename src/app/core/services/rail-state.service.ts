import { Injectable, signal } from '@angular/core';

const CLAVE = 'nfc-soft.rail-colapsado';

function hayAlmacenamiento(): boolean {
  return typeof localStorage !== 'undefined';
}

@Injectable({ providedIn: 'root' })
export class RailStateService {
  readonly colapsado = signal(
    hayAlmacenamiento() ? localStorage.getItem(CLAVE) === '1' : this.pantallaEstrecha(),
  );

  private pantallaEstrecha(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 1180;
  }

  alternar(): void {
    const siguiente = !this.colapsado();
    this.colapsado.set(siguiente);
    if (hayAlmacenamiento()) {
      localStorage.setItem(CLAVE, siguiente ? '1' : '0');
    }
  }
}

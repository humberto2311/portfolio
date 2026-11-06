import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const PREFIJO = 'nfc-soft.tour';

@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly plataforma = inject(PLATFORM_ID);

  readonly abierto = signal(false);
  readonly paso = signal(0);

  abrir(): void {
    this.paso.set(0);
    this.abierto.set(true);
  }

  cerrar(cuenta?: string): void {
    this.abierto.set(false);
    this.paso.set(0);
    if (cuenta) {
      this.guardarCuenta(cuenta);
    }
  }

  avanzar(total: number, cuenta?: string): void {
    if (this.paso() + 1 >= total) {
      this.cerrar(cuenta);
      return;
    }
    this.paso.update((p) => p + 1);
  }

  retroceder(): void {
    this.paso.update((p) => Math.max(0, p - 1));
  }

  pendiente(cuenta: string): boolean {
    return this.hayNavegador() && !localStorage.getItem(this.clave(cuenta));
  }

  guardarCuenta(cuenta: string): void {
    if (this.hayNavegador()) {
      localStorage.setItem(this.clave(cuenta), 'visto');
    }
  }

  private clave(cuenta: string): string {
    return `${PREFIJO}.${cuenta || 'anon'}`;
  }

  private hayNavegador(): boolean {
    return isPlatformBrowser(this.plataforma);
  }
}

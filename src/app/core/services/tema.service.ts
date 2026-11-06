import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const CLAVE = 'nfc-soft.tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private readonly plataforma = inject(PLATFORM_ID);

  readonly claro = signal(this.leer());

  alternar(): void {
    this.guardar(!this.claro());
  }

  guardar(claro: boolean): void {
    this.claro.set(claro);
    if (this.hayNavegador()) {
      localStorage.setItem(CLAVE, claro ? 'claro' : 'oscuro');
    }
  }

  pintar(claro: boolean): void {
    if (this.hayNavegador()) {
      this.documento.documentElement.dataset['tema'] = claro ? 'claro' : 'oscuro';
    }
  }

  private leer(): boolean {
    return this.hayNavegador() && localStorage.getItem(CLAVE) === 'claro';
  }

  private hayNavegador(): boolean {
    return isPlatformBrowser(this.plataforma);
  }
}

import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  mensaje = signal<string | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  show(msg: string): void {
    this.mensaje.set(msg);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.mensaje.set(null), 3000);
  }
}
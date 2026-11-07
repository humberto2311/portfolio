import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface InfoDispositivo {
  marca: string;
  fabricante: string;
  modelo: string;
  sistema: string;
  versionSistema: string;
  api: number;
  tieneNfc: boolean;
  nfcActivado: boolean;
  emulacionDisponible: boolean;
  emitiendo: boolean;
  permisos: Record<string, boolean>;
}

export interface ToqueLeido {
  enlace?: string;
  texto?: string;
  datos?: string;
  origen?: string;
  error?: string;
}

export interface AvisoEmision {
  enlace: string;
  bytes: number;
  emulacionDisponible: boolean;
}

interface PilaNfc {
  informacion(): Promise<InfoDispositivo>;
  solicitarPermisos(): Promise<Record<string, boolean>>;
  empezarEmision(pedido: { enlace: string; datos?: string }): Promise<AvisoEmision>;
  detenerEmision(): Promise<void>;
  empezarLectura(): Promise<void>;
  pararLectura(): Promise<void>;
  addListener(evento: 'toque', callback: (toque: ToqueLeido) => void): Promise<{ remove: () => void }>;
}

@Injectable({ providedIn: 'root' })
export class EmisoraNfcService {
  readonly esNativa = Capacitor.isNativePlatform();

  private pila?: PilaNfc;

  private nativa(): PilaNfc {
    this.pila ??= registerPlugin<PilaNfc>('DispositivoNfc');
    return this.pila;
  }

  async informacion(): Promise<InfoDispositivo | null> {
    if (!this.esNativa) return null;

    try {
      return await this.nativa().informacion();
    } catch {
      return null;
    }
  }

  async solicitarPermisos(): Promise<Record<string, boolean> | null> {
    if (!this.esNativa) return null;

    try {
      return await this.nativa().solicitarPermisos();
    } catch {
      return null;
    }
  }

  async emitir(enlace: string, datos: string): Promise<AvisoEmision> {
    return this.nativa().empezarEmision({ enlace, datos });
  }

  async dejarDeEmitir(): Promise<void> {
    await this.nativa().detenerEmision();
  }

  async escuchar(callback: (toque: ToqueLeido) => void): Promise<() => Promise<void>> {
    const escucha = await this.nativa().addListener('toque', callback);
    await this.nativa().empezarLectura();

    return async () => {
      await escucha.remove();
      await this.nativa().pararLectura();
    };
  }

  async dejarDeEscuchar(): Promise<void> {
    await this.nativa().pararLectura();
  }
}

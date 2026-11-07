import { Injectable, inject, signal } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import { VcardService } from './vcard.service';
import { ToqueNfcService } from './toque-nfc.service';
import { VCardPayload } from '../models/vcard.model';

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
  enlace: string;
  permisos: Record<string, boolean>;
}

export interface ToqueLeido {
  enlace?: string;
  texto?: string;
  datos?: string;
  origen?: string;
  error?: string;
  entregada?: boolean;
  procedencia?: string;
}

export interface AvisoEmision {
  enlace: string;
  bytes: number;
  emulacionDisponible: boolean;
  sinEnlace?: boolean;
}

interface ContenidoEmision {
  enlace: string;
  usuarioId?: string;
  tarjeta?: string;
  nombre?: string;
  origen: 'EMISION';
}

interface PilaNfc {
  informacion(): Promise<InfoDispositivo>;
  solicitarPermisos(): Promise<Record<string, boolean>>;
  empezarEmision(pedido: { enlace: string; datos?: string }): Promise<AvisoEmision>;
  detenerEmision(): Promise<void>;
  empezarLectura(): Promise<void>;
  pararLectura(): Promise<void>;
  addListener(evento: 'toque', callback: (toque: ToqueLeido) => void): Promise<{ remove(): Promise<void> }>;
}

@Injectable({ providedIn: 'root' })
export class EmisoraNfcService {
  readonly esNativa = Capacitor.isNativePlatform();
  readonly escuchando = signal(false);
  readonly recibido = signal<ToqueLeido | null>(null);
  readonly grabado = signal(false);

  private readonly nfc = inject(ToqueNfcService);
  private readonly vcard = inject(VcardService);
  private readonly auth = inject(AuthService);

  private pila?: PilaNfc;
  private escucha: { remove(): Promise<void> } | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

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

  async despertar(): Promise<void> {
    if (!this.esNativa || !this.auth.currentUser()) return;

    try {
      await this.preparar();
      await this.oir();
    } catch {
      return;
    }
  }

  async preparar(tarjeta?: VCardPayload | null): Promise<AvisoEmision | null> {
    if (!this.esNativa) return null;

    const eleccion = tarjeta ?? await this.tarjetaPorDefecto();

    if (!eleccion) return null;

    const slug = eleccion.slug ?? 'personal';
    const userId = eleccion.userProfileId ?? this.auth.currentUser()?.id ?? '';
    const enlace = userId ? await this.nfc.enlaceDe(userId, slug) : '';
    const contenido: ContenidoEmision = {
      enlace,
      usuarioId: userId,
      tarjeta: slug,
      nombre: eleccion.nombre,
      origen: 'EMISION',
    };

    return this.nativa().empezarEmision({ enlace, datos: JSON.stringify(contenido) });
  }

  async oir(): Promise<void> {
    if (!this.esNativa || this.escucha) return;

    this.escucha = await this.nativa().addListener('toque', (toque) => void this.alToque(toque));
  }

  async empezarLectura(ms = 40000): Promise<void> {
    if (!this.esNativa) return;

    await this.oir();
    this.recibido.set(null);
    this.grabado.set(false);
    await this.nativa().empezarLectura();

    this.escuchando.set(true);
    this.tiempo(ms);
  }

  async dejarDeEscuchar(): Promise<void> {
    if (!this.esNativa) return;

    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }

    try {
      await this.nativa().pararLectura();
    } finally {
      this.escuchando.set(false);
    }
  }

  async desarmar(): Promise<void> {
    if (!this.esNativa) return;

    await this.dejarDeEscuchar();

    const escucha = this.escucha;
    this.escucha = null;

    await escucha?.remove().catch(() => {});
    await this.nativa().detenerEmision().catch(() => {});

    this.recibido.set(null);
    this.grabado.set(false);
  }

  private tiempo(ms: number): void {
    if (this.temporizador) clearTimeout(this.temporizador);

    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      void this.dejarDeEscuchar();
    }, ms);
  }

  private async tarjetaPorDefecto(): Promise<VCardPayload | null> {
    try {
      const lista = await firstValueFrom(this.vcard.listar());
      const sana = Array.isArray(lista) ? lista : [];

      return sana.find((t) => t.porDefecto) ?? sana[0] ?? null;
    } catch {
      return null;
    }
  }

  private async alToque(toque: ToqueLeido): Promise<void> {
    this.recibido.set(toque);

    const contenido = this.parsea(toque.datos);

    if (this.escuchando()) await this.dejarDeEscuchar();

    if (toque.error || !contenido?.usuarioId) return;

    const telefono = await this.informacion();

    this.grabado.set(await this.nfc.registrar({
      usuarioId: contenido.usuarioId,
      tarjeta: contenido.tarjeta,
      enlace: toque.enlace ?? contenido.enlace,
      origen: 'EMISION',
      dispositivoMarca: telefono?.marca,
      dispositivoModelo: telefono?.modelo,
      sistemaOperativo: telefono?.sistema,
      versionSistema: telefono?.versionSistema,
      tieneApp: true,
    }));
  }

  private parsea(crudo?: string): ContenidoEmision | null {
    if (!crudo) return null;

    try {
      return JSON.parse(crudo) as ContenidoEmision;
    } catch {
      return null;
    }
  }
}

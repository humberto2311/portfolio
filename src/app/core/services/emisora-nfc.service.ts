import { Injectable, inject, signal } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

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

export interface Transmision {
  fase: string;
  rol: string;
  enviados: number;
  total: number;
}

export interface EstadoNfc {
  tieneNfc: boolean;
  nfcActivado: boolean;
  emulacionSoportada: boolean;
  tarjetaCargada: boolean;
  leyendo: boolean;
  categoriaSoportada: boolean;
  emisionPropia: boolean;
  esLaPredeterminada: boolean;
  aids: string[];
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
  estado(): Promise<EstadoNfc>;
  solicitarPermisos(): Promise<Record<string, boolean>>;
  empezarEmision(pedido: { enlace: string; datos?: string }): Promise<AvisoEmision>;
  detenerEmision(): Promise<void>;
  empezarLectura(pedido?: { segundos?: number }): Promise<{ leyendo: boolean; segundos: number }>;
  pararLectura(): Promise<void>;
  rutaPendiente(): Promise<{ ruta?: string }>;
  addListener(evento: 'toque', callback: (toque: ToqueLeido) => void): Promise<{ remove(): Promise<void> }>;
  addListener(evento: 'enlace', callback: (aviso: { ruta?: string }) => void): Promise<{ remove(): Promise<void> }>;
  addListener(evento: 'lecturaCerrada', callback: (aviso: { motivo?: string }) => void): Promise<{ remove(): Promise<void> }>;
  addListener(evento: 'transmision', callback: (aviso: Transmision) => void): Promise<{ remove(): Promise<void> }>;
}

@Injectable({ providedIn: 'root' })
export class EmisoraNfcService {
  readonly esNativa = Capacitor.isNativePlatform();
  readonly escuchando = signal(false);
  readonly recibido = signal<ToqueLeido | null>(null);
  readonly grabado = signal(false);
  readonly estado = signal<EstadoNfc | null>(null);
  readonly ventana = signal(60);
  readonly motivoCierre = signal('');
  readonly transmision = signal<Transmision | null>(null);
  readonly entregaEnlace = signal('');

  private readonly nfc = inject(ToqueNfcService);
  private readonly vcard = inject(VcardService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private pila?: PilaNfc;
  private escucha: { remove(): Promise<void> } | null = null;
  private escuchaCierre: { remove(): Promise<void> } | null = null;
  private escuchaEmision: { remove(): Promise<void> } | null = null;
  private espera: ReturnType<typeof setTimeout> | null = null;
  private permisosPedidos = false;

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

  async pedirEstado(): Promise<EstadoNfc | null> {
    if (!this.esNativa) return null;

    try {
      const nuevo = await this.nativa().estado();
      this.estado.set(nuevo);

      return nuevo;
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
      await this.pedirPermisos();
      await this.preparar();
      await this.oir();
      await this.pedirEstado();
    } catch {
      return;
    }
  }

  async sigueEnlaces(): Promise<void> {
    if (!this.esNativa) return;

    try {
      this.irA((await this.nativa().rutaPendiente())?.ruta);

      await this.nativa().addListener('enlace', (aviso) => this.irA(aviso?.ruta));
    } catch {
      return;
    }
  }

  private irA(ruta?: string): void {
    if (ruta?.startsWith('/tarjeta/')) void this.router.navigateByUrl(ruta);
  }

  private async pedirPermisos(): Promise<void> {
    if (this.permisosPedidos) return;

    this.permisosPedidos = true;
    await this.solicitarPermisos();
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

    const emitida = await this.nativa().empezarEmision({ enlace, datos: JSON.stringify(contenido) });

    this.entregaEnlace.set(enlace);

    return emitida;
  }

  async oir(): Promise<void> {
    if (!this.esNativa) return;

    if (!this.escucha) {
      this.escucha = await this.nativa().addListener('toque', (toque) => void this.alToque(toque));
    }

    if (!this.escuchaCierre) {
      this.escuchaCierre = await this.nativa().addListener('lecturaCerrada', (aviso) => {
        this.escuchando.set(false);
        this.motivoCierre.set(aviso?.motivo ?? '');
      });
    }

    if (!this.escuchaEmision) {
      this.escuchaEmision = await this.nativa().addListener('transmision', (aviso) => this.alTransmision(aviso));
    }
  }

  async transmitir(tarjeta?: VCardPayload | null): Promise<AvisoEmision | null> {
    if (!this.esNativa) return null;

    if (this.escuchando()) await this.dejarDeEscuchar();

    const emitida = await this.preparar(tarjeta);

    if (!emitida) return null;

    await this.oir();
    this.transmision.set({ fase: 'buscando', rol: '', enviados: 0, total: 0 });
    this.esperaBusqueda();

    return emitida;
  }

  dejaDeTransmitir(): void {
    this.transmision.set(null);
    this.olvida();
  }

  private alTransmision(aviso: Transmision): void {
    if (!this.transmision()) return;

    if (aviso.fase === 'salio') {
      this.transmision.set(aviso);
      this.olvida();
      this.espera = setTimeout(() => {
        this.espera = null;
        if (this.transmision()?.fase === 'salio') {
          this.transmision.set({ fase: 'buscando', rol: '', enviados: 0, total: 0 });
          this.esperaBusqueda();
        }
      }, 2500);

      return;
    }

    this.transmision.set(aviso);

    if (aviso.fase === 'conectado' || aviso.fase === 'enviando' || aviso.fase === 'enviado') {
      this.olvida();
    }
  }

  private esperaBusqueda(): void {
    this.olvida();

    this.espera = setTimeout(() => {
      this.espera = null;

      if (this.transmision()?.fase === 'buscando') {
        this.transmision.set({ fase: 'nadie', rol: '', enviados: 0, total: 0 });
      }
    }, 40000);
  }

  private olvida(): void {
    if (this.espera) {
      clearTimeout(this.espera);
      this.espera = null;
    }
  }

  async empezarLectura(segundos = 60): Promise<void> {
    if (!this.esNativa) return;

    await this.oir();
    this.recibido.set(null);
    this.grabado.set(false);
    this.motivoCierre.set('');

    const abierto = await this.nativa().empezarLectura({ segundos });

    this.ventana.set(abierto.segundos);
    this.escuchando.set(true);
  }

  async dejarDeEscuchar(): Promise<void> {
    if (!this.esNativa) return;

    try {
      await this.nativa().pararLectura();
    } finally {
      this.escuchando.set(false);
    }
  }

  async desarmar(): Promise<void> {
    if (!this.esNativa) return;

    await this.dejarDeEscuchar();
    this.olvida();

    const [escucha, escuchaCierre, escuchaEmision] = [this.escucha, this.escuchaCierre, this.escuchaEmision];
    this.escucha = null;
    this.escuchaCierre = null;
    this.escuchaEmision = null;

    await escucha?.remove().catch(() => {});
    await escuchaCierre?.remove().catch(() => {});
    await escuchaEmision?.remove().catch(() => {});
    await this.nativa().detenerEmision().catch(() => {});

    this.recibido.set(null);
    this.grabado.set(false);
    this.transmision.set(null);
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
    const delEnlace = contenido?.usuarioId ? null : this.desdeEnlace(toque.enlace);
    const usuarioId = contenido?.usuarioId ?? delEnlace?.usuarioId;

    if (toque.error || !usuarioId) return;

    if (this.escuchando()) await this.dejarDeEscuchar();

    const telefono = await this.informacion();

    this.grabado.set(await this.nfc.registrar({
      usuarioId,
      tarjeta: contenido?.tarjeta ?? delEnlace?.tarjeta,
      enlace: toque.enlace ?? contenido?.enlace,
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

  private desdeEnlace(enlace?: string): { usuarioId: string; tarjeta: string } | null {
    const coincidencia = /\/tarjeta\/([^/?#]+)\/([^/?#]+)/.exec(enlace ?? '');

    if (!coincidencia) return null;

    return { usuarioId: coincidencia[1], tarjeta: coincidencia[2] };
  }
}

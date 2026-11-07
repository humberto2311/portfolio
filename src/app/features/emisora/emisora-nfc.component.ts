import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { VcardService } from '../../core/services/vcard.service';
import { ToqueNfcService, ToqueDetalle, ContactoNfc } from '../../core/services/toque-nfc.service';
import { EmisoraNfcService, InfoDispositivo, ToqueLeido } from '../../core/services/emisora-nfc.service';
import { VCardPayload } from '../../core/models/vcard.model';

interface GrupoPermiso {
  etiqueta: string;
  icono: string;
  claves: string[];
}

interface Emision {
  enlace: string;
  usuarioId?: string;
  tarjeta?: string;
  nombre?: string;
  origen: 'EMISION';
}

@Component({
  selector: 'app-emisora-nfc',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './emisora-nfc.component.html',
  styleUrls: ['./emisora-nfc.component.scss'],
})
export class EmisoraNfcComponent implements OnInit, OnDestroy {
  private readonly nfc = inject(EmisoraNfcService);
  private readonly toques = inject(ToqueNfcService);
  private readonly vcard = inject(VcardService);
  private readonly auth = inject(AuthService);

  readonly esNativa = this.nfc.esNativa;
  readonly grupos: GrupoPermiso[] = [
    { etiqueta: 'Cámara', icono: 'fa-solid fa-camera', claves: ['CAMERA'] },
    { etiqueta: 'Contactos', icono: 'fa-solid fa-address-book', claves: ['READ_CONTACTS', 'WRITE_CONTACTS'] },
    { etiqueta: 'Dispositivos cercanos', icono: 'fa-brands fa-bluetooth-b', claves: ['BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT', 'BLUETOOTH'] },
    { etiqueta: 'Fotos y videos', icono: 'fa-solid fa-images', claves: ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_EXTERNAL_STORAGE'] },
    { etiqueta: 'Ubicación', icono: 'fa-solid fa-location-dot', claves: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'] },
    { etiqueta: 'Notificaciones', icono: 'fa-solid fa-bell', claves: ['POST_NOTIFICATIONS'] },
  ];

  readonly info = signal<InfoDispositivo | null>(null);
  readonly tarjetas = signal<VCardPayload[]>([]);
  readonly slug = signal('');
  readonly emitiendo = signal(false);
  readonly escuchando = signal(false);
  readonly recibido = signal<ToqueLeido | null>(null);
  readonly ocupado = signal(false);
  readonly listaToques = signal<ToqueDetalle[]>([]);
  readonly totalToques = signal(0);
  readonly sugerencias = signal<ContactoNfc[]>([]);

  enlace = '';
  aviso = '';
  error = '';

  private detenerEscucha: (() => Promise<void>) | null = null;

  async ngOnInit(): Promise<void> {
    if (!this.esNativa) return;

    const lista = await new Promise<VCardPayload[]>((resolver) => {
      this.vcard.listar().subscribe({
        next: (t) => resolver(t ?? []),
        error: () => resolver([]),
      });
    });

    this.tarjetas.set(lista);
    const primera = lista.find((t) => t.porDefecto) ?? lista[0];

    if (primera) {
      await this.seleccionarTarjeta(primera.slug ?? 'personal');
    }

    await this.leerTelefono();
    await this.cargarToques();
  }

  async ngOnDestroy(): Promise<void> {
    if (this.emitiendo()) await this.dejarDeEmitir();
    await this.pararEscucha();
  }

  async leerTelefono(): Promise<void> {
    this.info.set(await this.nfc.informacion());
  }

  async cargarToques(): Promise<void> {
    const [lista, sugeridas] = await Promise.all([
      this.toques.mis(),
      firstValueFrom(this.toques.sugerencias()),
    ]);

    this.listaToques.set(lista.toques);
    this.totalToques.set(lista.total);
    this.sugerencias.set(sugeridas ?? []);
  }

  async activarPermisos(): Promise<void> {
    this.aviso = '';
    await this.nfc.solicitarPermisos();
    await this.leerTelefono();
    this.aviso = 'Revisa la lista: si algo quedó apagado puedes volver a pedirlo.';
  }

  concedido(grupo: GrupoPermiso): boolean {
    const permisos = this.info()?.permisos ?? {};
    const aplicables = grupo.claves.filter((clave) => clave in permisos);

    return aplicables.length > 0 && aplicables.every((clave) => permisos[clave]);
  }

  async seleccionarTarjeta(slug: string): Promise<void> {
    this.slug.set(slug);
    const userId = this.userIdTarjeta();
    this.enlace = userId ? await this.toques.enlaceDe(userId, slug) : '';
  }

  private userIdTarjeta(): string {
    const tarjeta = this.tarjetas().find((t) => t.slug === this.slug());
    return tarjeta?.userProfileId ?? this.auth.currentUser()?.id ?? '';
  }

  async emitir(): Promise<void> {
    this.error = '';
    this.aviso = '';

    if (!this.enlace.trim()) {
      this.error = 'Pon el enlace que debe abrir el otro teléfono.';
      return;
    }

    const tarjeta = this.tarjetas().find((t) => t.slug === this.slug());
    const contenido: Emision = {
      enlace: this.enlace.trim(),
      usuarioId: this.userIdTarjeta(),
      tarjeta: this.slug(),
      nombre: tarjeta?.nombre,
      origen: 'EMISION',
    };

    this.ocupado.set(true);

    try {
      const resultado = await this.nfc.emitir(this.enlace.trim(), JSON.stringify(contenido));
      this.emitiendo.set(true);
      this.info.set(await this.nfc.informacion());
      this.aviso = resultado.emulacionDisponible
        ? 'Emitiendo. Mantén la pantalla encendida y pega el dorso del teléfono al otro.'
        : 'Emitiendo, pero este teléfono no reporta soporte de emulación NFC: puede que el otro no lo lea.';
    } catch (e) {
      this.error = mensaje(e, 'No se pudo empezar a emitir.');
    } finally {
      this.ocupado.set(false);
    }
  }

  async dejarDeEmitir(): Promise<void> {
    try {
      await this.nfc.dejarDeEmitir();
    } finally {
      this.emitiendo.set(false);
      this.info.set(await this.nfc.informacion());
    }
  }

  async escuchar(): Promise<void> {
    this.error = '';
    this.recibido.set(null);
    this.ocupado.set(true);

    try {
      this.detenerEscucha = await this.nfc.escuchar((toque) => void this.alRecibir(toque));
      this.escuchando.set(true);
      this.aviso = 'Acercando el otro teléfono: espera el aviso.';
    } catch (e) {
      this.error = mensaje(e, 'No se pudo activar la lectura.');
    } finally {
      this.ocupado.set(false);
    }
  }

  async pararEscucha(): Promise<void> {
    const detener = this.detenerEscucha;
    this.detenerEscucha = null;

    try {
      await detener?.();
    } catch {
      await this.nfc.dejarDeEscuchar();
    } finally {
      this.escuchando.set(false);
    }
  }

  private async alRecibir(toque: ToqueLeido): Promise<void> {
    this.recibido.set(toque);

    if (toque.error) {
      this.error = toque.error;
      return;
    }

    const emitida = this.parsear(toque.datos);
    const userId = emitida?.usuarioId;

    if (!userId) return;

    const telefono = this.info();

    const grabado = await this.toques.registrar({
      usuarioId: userId,
      tarjeta: emitida?.tarjeta,
      enlace: toque.enlace ?? emitida?.enlace,
      origen: 'EMISION',
      dispositivoMarca: telefono?.marca,
      dispositivoModelo: telefono?.modelo,
      sistemaOperativo: telefono?.sistema,
      versionSistema: telefono?.versionSistema,
      tieneApp: true,
    });

    this.aviso = grabado
      ? 'Toque registrado con la ubicación y el dispositivo.'
      : 'Leí la tarjeta, pero no se pudo registrar el toque.';
  }

  private parsear(crudo?: string): Emision | null {
    if (!crudo) return null;

    try {
      return JSON.parse(crudo) as Emision;
    } catch {
      return null;
    }
  }

  copiar(): void {
    const valor = this.recibido()?.enlace ?? this.enlace;

    navigator.clipboard?.writeText(valor).then(
      () => this.aviso = 'Enlace copiado.',
      () => this.error = 'No se pudo copiar.',
    );
  }

  origen(valor: string): string {
    const mapa: Record<string, string> = {
      EMISION: 'Teléfono a teléfono',
      ETIQUETA: 'Etiqueta NFC',
      NAVEGADOR: 'Navegador',
      QR: 'QR de la tarjeta',
    };

    return mapa[valor] ?? valor;
  }

  get puedeEmitir(): boolean {
    return !this.ocupado() && !this.emitiendo();
  }
}

function mensaje(error: unknown, respaldo: string): string {
  const texto = (error as any)?.message ?? error;
  return typeof texto === 'string' && texto.trim() ? texto : respaldo;
}

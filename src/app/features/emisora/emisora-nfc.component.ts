import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { VcardService } from '../../core/services/vcard.service';
import { ToqueNfcService, ToqueDetalle, ContactoNfc } from '../../core/services/toque-nfc.service';
import { EmisoraNfcService, InfoDispositivo, ToqueLeido } from '../../core/services/emisora-nfc.service';
import { VCardPayload } from '../../core/models/vcard.model';

interface GrupoPermiso {
  etiqueta: string;
  claves: string[];
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

  readonly esNativa = this.nfc.esNativa;
  readonly grupos: GrupoPermiso[] = [
    { etiqueta: 'Ubicación', claves: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'] },
    { etiqueta: 'Cámara', claves: ['CAMERA'] },
    { etiqueta: 'Contactos', claves: ['READ_CONTACTS', 'WRITE_CONTACTS'] },
    { etiqueta: 'Notificaciones', claves: ['POST_NOTIFICATIONS'] },
  ];

  readonly info = signal<InfoDispositivo | null>(null);
  readonly tarjetas = signal<VCardPayload[]>([]);
  readonly slug = signal('');
  readonly listaToques = signal<ToqueDetalle[]>([]);
  readonly totalToques = signal(0);
  readonly sugerencias = signal<ContactoNfc[]>([]);
  readonly ocupado = signal(false);

  readonly escuchando = computed(() => this.nfc.escuchando());
  readonly recibido = computed(() => this.nfc.recibido());
  readonly grabado = computed(() => this.nfc.grabado());

  aviso = '';
  error = '';

  constructor() {
    effect(() => {
      if (this.nfc.grabado()) void this.cargarToques();
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.esNativa) return;

    const lista = await firstValueFrom(this.vcard.listar()).catch(() => [] as VCardPayload[]);
    const saneada = Array.isArray(lista) ? lista : [];

    this.tarjetas.set(saneada);

    const primera = saneada.find((t) => t.porDefecto) ?? saneada[0];

    if (primera) {
      await this.seleccionarTarjeta(primera.slug ?? 'personal');
    }

    await this.leerTelefono();
    await this.cargarToques();
  }

  async ngOnDestroy(): Promise<void> {
    if (this.escuchando()) await this.nfc.dejarDeEscuchar();
  }

  async seleccionarTarjeta(slug: string): Promise<void> {
    this.slug.set(slug);
    this.error = '';
    this.aviso = '';
    this.ocupado.set(true);

    try {
      const emitida = await this.nfc.preparar(this.tarjetas().find((t) => t.slug === slug) ?? null);

      if (!emitida) {
        this.error = 'No hay tarjeta que entregar.';
      } else if (!emitida.enlace) {
        this.aviso = 'No pude tomar el enlace de esta tarjeta, pero quien tenga la app abierta igual la recibe.';
      } else if (!emitida.emulacionDisponible) {
        this.aviso = 'Este teléfono no reporta emulación NFC: puede que el otro no lo lea.';
      } else {
        this.aviso = 'Tu tarjeta ya está lista para que se la acerquen.';
      }

      this.info.set(await this.nfc.informacion());
    } catch (e) {
      this.error = mensaje(e, 'No se pudo preparar la tarjeta.');
    } finally {
      this.ocupado.set(false);
    }
  }

  async intercambiar(): Promise<void> {
    this.error = '';
    this.aviso = '';
    this.ocupado.set(true);

    try {
      await this.nfc.empezarLectura();
      this.aviso = 'Pega el dorso de tu teléfono contra el otro y espera el aviso.';
    } catch (e) {
      this.error = mensaje(e, 'No se pudo poner este teléfono a leer.');
    } finally {
      this.ocupado.set(false);
    }
  }

  async cancelar(): Promise<void> {
    await this.nfc.dejarDeEscuchar();
    this.aviso = 'Se cerró la lectura.';
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
    await this.nfc.solicitarPermisos();
    await this.leerTelefono();
  }

  concedido(grupo: GrupoPermiso): boolean {
    const permisos = this.info()?.permisos ?? {};
    const aplicables = grupo.claves.filter((clave) => clave in permisos);

    return aplicables.length > 0 && aplicables.every((clave) => permisos[clave]);
  }

  get faltanPermisos(): boolean {
    const telefono = this.info();

    return telefono !== null && this.grupos.some((grupo) => !this.concedido(grupo));
  }

  get enlaceActual(): string {
    return this.info()?.enlace ?? '';
  }

  get nfcApagado(): boolean {
    const telefono = this.info();

    return telefono !== null && (!telefono.tieneNfc || !telefono.nfcActivado);
  }

  get elOtroRecibio(): boolean {
    return this.recibido()?.entregada === true;
  }

  get fueMiTarjeta(): boolean {
    return this.recibido()?.procedencia === 'TARJETA';
  }

  tieneContenido(toque: ToqueLeido): boolean {
    return Boolean(toque.enlace || toque.datos || toque.texto);
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

  get puedeIntercambiar(): boolean {
    return !this.ocupado() && !this.escuchando();
  }
}

function mensaje(error: unknown, respaldo: string): string {
  const texto = (error as any)?.message ?? error;
  return typeof texto === 'string' && texto.trim() ? texto : respaldo;
}

import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { VcardService } from '../../core/services/vcard.service';
import { ToqueNfcService, ToqueDetalle, ContactoNfc } from '../../core/services/toque-nfc.service';
import { EmisoraNfcService, EstadoNfc, InfoDispositivo, ToqueLeido, Transmision } from '../../core/services/emisora-nfc.service';
import { VCardPayload } from '../../core/models/vcard.model';

interface PantallaEnvio {
  titulo: string;
  detalle: string;
  marca: string;
  progreso: number;
  latiendo: boolean;
}

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
  readonly estado = computed(() => this.nfc.estado());
  readonly transmision = computed<Transmision | null>(() => this.nfc.transmision());
  readonly enlace = computed(() => this.nfc.entregaEnlace());

  private cierreEnvio: ReturnType<typeof setTimeout> | null = null;

  readonly envio = computed<PantallaEnvio | null>(() => {
    const envio = this.transmision();

    if (!envio) return null;

    if (envio.fase === 'conectado') {
      return {
        titulo: 'Dispositivo encontrado',
        detalle: 'Sostén los dos teléfonos juntos hasta que termine el envío.',
        marca: 'fa-solid fa-link',
        progreso: 0,
        latiendo: true,
      };
    }

    if (envio.fase === 'enviando') {
      return {
        titulo: 'Enviando información',
        detalle: 'Sostén los dos teléfonos juntos.',
        marca: 'fa-solid fa-arrow-up',
        progreso: this.progreso(),
        latiendo: true,
      };
    }

    if (envio.fase === 'enviado') {
      return {
        titulo: 'Tarjeta entregada',
        detalle: 'Tu enlace ya está en el otro teléfono: se abre en la app si la tiene instalada y en el navegador si no.',
        marca: 'fa-solid fa-check',
        progreso: 100,
        latiendo: false,
      };
    }

    if (envio.fase === 'salio') {
      return {
        titulo: 'Se separaron demasiado pronto',
        detalle: 'El otro teléfono se fue antes de terminar de leer. Acércalos de nuevo y sostiene un segundo.',
        marca: 'fa-solid fa-rotate-left',
        progreso: 0,
        latiendo: false,
      };
    }

    if (envio.fase === 'nadie') {
      return {
        titulo: 'Nadie acercó su teléfono',
        detalle: 'El otro teléfono solo necesita tener el NFC encendido y la pantalla lista: no tiene que abrir nada.',
        marca: 'fa-solid fa-hourglass-end',
        progreso: 0,
        latiendo: false,
      };
    }

    return {
      titulo: 'Buscando dispositivo',
      detalle: 'Pega el dorso de tu teléfono contra el del otro. Tú eres el que entrega: del otro lado no hay que pulsar nada.',
      marca: 'fa-solid fa-tower-broadcast',
      progreso: 0,
      latiendo: true,
    };
  });

  readonly progreso = computed(() => {
    const envio = this.transmision();

    return envio && envio.total > 0 ? Math.round((envio.enviados * 100) / envio.total) : 0;
  });

  readonly porDonde = computed(() => {
    if (this.transmision()?.fase !== 'enviado') return '';
    if (this.transmision()?.rol === 'propia') return 'El otro teléfono la leyó con la app de sistem.';
    if (this.transmision()?.rol === 'etiqueta') return 'El otro teléfono la leyó como tarjeta NFC: su navegador abre el enlace.';

    return '';
  });

  readonly ventana = signal(60);
  readonly motivoCierre = computed(() => this.nfc.motivoCierre());

  aviso = '';
  error = '';

  constructor() {
    effect(() => {
      if (this.nfc.grabado()) void this.cargarToques();
    });

    effect(() => {
      if (this.transmision()?.fase !== 'enviado') return;

      void this.cargarToques();
      this.cierraEnvioEn(4000);
    });
  }

  private cierraEnvioEn(ms: number): void {
    if (this.cierreEnvio) clearTimeout(this.cierreEnvio);

    this.cierreEnvio = setTimeout(() => {
      this.cierreEnvio = null;
      this.nfc.dejaDeTransmitir();
    }, ms);
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
    if (this.cierreEnvio) clearTimeout(this.cierreEnvio);

    this.nfc.dejaDeTransmitir();
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

      await this.leerTelefono();
    } catch (e) {
      this.error = mensaje(e, 'No se pudo preparar la tarjeta.');
    } finally {
      this.ocupado.set(false);
    }
  }

  async transmitir(): Promise<void> {
    this.error = '';
    this.aviso = '';
    this.ocupado.set(true);

    try {
      const emitida = await this.nfc.transmitir(this.tarjetas().find((t) => t.slug === this.slug()) ?? null);

      if (!emitida) this.error = 'No hay tarjeta que entregar.';
    } catch (e) {
      this.nfc.dejaDeTransmitir();
      this.error = mensaje(e, 'No se pudo poner a transmitir.');
    } finally {
      this.ocupado.set(false);
    }
  }

  cerrarEnvio(): void {
    if (this.cierreEnvio) {
      clearTimeout(this.cierreEnvio);
      this.cierreEnvio = null;
    }

    this.nfc.dejaDeTransmitir();
  }

  async intercambiar(): Promise<void> {
    this.error = '';
    this.aviso = '';
    this.ocupado.set(true);

    try {
      await this.nfc.empezarLectura();
      this.ventana.set(this.nfc.ventana());
      this.aviso = 'Pega el dorso de tu teléfono contra el otro y espera el aviso.';
    } catch (e) {
      this.error = mensaje(e, 'No se pudo poner este teléfono a leer.');
    } finally {
      await this.leerTelefono();
      this.ocupado.set(false);
    }
  }

  async cancelar(): Promise<void> {
    await this.nfc.dejarDeEscuchar();
    this.aviso = 'Se cerró la lectura: tu teléfono vuelve a poder entregar su tarjeta.';
    await this.leerTelefono();
  }

  async leerTelefono(): Promise<void> {
    this.info.set(await this.nfc.informacion());
    await this.nfc.pedirEstado();
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
    return this.enlace() || this.info()?.enlace || '';
  }

  get tarjetaElegida(): string {
    const propia = this.tarjetas().find((t) => t.slug === this.slug());

    return propia?.nombre || propia?.slug || this.slug() || 'personal';
  }

  get bloqueo(): string {
    const estado: EstadoNfc | null = this.estado();

    if (!estado) return '';
    if (!estado.tieneNfc) return 'Este teléfono no tiene NFC: no puede entregar ni recibir tarjetas.';
    if (!estado.nfcActivado) return 'El NFC está apagado. Enciéndelo en los ajustes del teléfono.';
    if (!estado.categoriaSoportada || !estado.emisionPropia) return 'Android no registró la emisión de esta app: reinstala el instalador y vuelve a abrirla.';
    if (!estado.tarjetaCargada) return 'Tu tarjeta todavía no está cargada: elige una arriba.';
    if (estado.leyendo) return 'Este teléfono está leyendo. Mientras lea no puede entregar su tarjeta: que el otro acerque el suyo.';

    return '';
  }

  get cerroPorTiempo(): boolean {
    return !this.escuchando() && this.motivoCierre() === 'ventana' && !this.recibido();
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
    return !this.ocupado() && !this.escuchando() && !this.transmision();
  }

  get puedeTransmitir(): boolean {
    return !this.ocupado() && !this.transmision();
  }
}

function mensaje(error: unknown, respaldo: string): string {
  const texto = (error as any)?.message ?? error;
  return typeof texto === 'string' && texto.trim() ? texto : respaldo;
}

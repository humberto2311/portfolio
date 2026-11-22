import { Component, DestroyRef, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { BotComando, RespuestaComando } from '../../../core/models/comando.model';
import { ComandosService } from '../../../core/services/comandos.service';
import { ToqueNfcService } from '../../../core/services/toque-nfc.service';
import { EstadoNfc } from '../../../core/models/nfc-estado.model';

interface MensajeComando {
  autor: 'yo' | 'sistema' | 'ia';
  texto: string;
  comando?: string | null;
  ejemplo?: string;
  confirmacion?: RespuestaComando;
  nfc?: EstadoNfc;
}

@Component({
  selector: 'app-comandos-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comandos-chat.component.html',
  styleUrls: ['./comandos-chat.component.scss']
})
export class ComandosChatComponent implements OnInit {
  @Input() conversacionId: string | null = null;
  @Input() compacto = false;

  private comandos = inject(ComandosService);
  private toques = inject(ToqueNfcService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly mensajes = signal<MensajeComando[]>([]);
  readonly texto = signal('');
  readonly enviando = signal(false);
  readonly panelBots = signal(false);
  readonly panelAyuda = signal(false);
  readonly bots = signal<BotComando[]>([]);
  readonly modoIa = signal(false);
  readonly pendiente = signal<RespuestaComando | null>(null);
  readonly copiado = signal<string | null>(null);
  readonly estadoNfc = signal<EstadoNfc | null>(null);

  readonly hayPendiente = computed(() => this.pendiente() !== null);
  readonly modoTraduciendo = computed(() => this.modoIa() && this.enviando());
  readonly hayBotsActivos = computed(() => this.bots().some((bot) => bot.activo));

  ngOnInit(): void {
    this.cargarBots();
  }

  enviar(): void {
    const valor = this.texto().trim();
    if (!valor || this.enviando()) return;

    this.mensajes.update((lista) => [...lista, { autor: 'yo', texto: valor }]);
    this.texto.set('');
    this.enviando.set(true);

    this.comandos.enviarMensaje(valor, this.conversacionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => this.recibir(respuesta),
        error: () => {
          this.enviando.set(false);
          this.mensajes.update((lista) => [
            ...lista,
            { autor: 'sistema', texto: 'No se pudo enviar el comando. Inténtalo de nuevo.' }
          ]);
        }
      });
  }

  confirmar(): void {
    this.ejecutar(this.comandos.confirmar(this.conversacionId));
  }

  cancelar(): void {
    this.ejecutar(this.comandos.cancelar(this.conversacionId));
  }

  alternarModoIa(): void {
    const nuevo = !this.modoIa();
    this.modoIa.set(nuevo);

    this.comandos.cambiarModoIa(nuevo, this.conversacionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.modoIa.set(!nuevo)
      });
  }

  alternarBot(bot: BotComando): void {
    const activo = !bot.activo;

    this.comandos.cambiarBot(bot.id, activo, this.conversacionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.cargarBots(),
        error: () => this.cargarBots()
      });
  }

  preguntarAyuda(): void {
    const consulta = this.texto().trim();
    if (!consulta || this.enviando()) return;

    this.mensajes.update((lista) => [...lista, { autor: 'yo', texto: consulta }]);
    this.texto.set('');
    this.enviando.set(true);

    this.comandos.pedirAyuda(consulta, this.conversacionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.enviando.set(false);
          this.mensajes.update((lista) => [
            ...lista,
            { autor: 'ia', texto: respuesta.mensaje, comando: respuesta.comando }
          ]);
        },
        error: () => {
          this.enviando.set(false);
          this.mensajes.update((lista) => [
            ...lista,
            { autor: 'sistema', texto: 'La ayuda con IA no respondió. Prueba más tarde.' }
          ]);
        }
      });
  }

  copiar(comando: string): void {
    navigator.clipboard.writeText(comando).then(() => {
      this.copiado.set(comando);
      setTimeout(() => this.copiado.set(null), 1600);
    });
  }

  parametrosDe(respuesta: RespuestaComando): Array<{ clave: string; valor: string }> {
    return Object.entries(respuesta.parametros ?? {}).map(([clave, valor]) => ({
      clave,
      valor: typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
    }));
  }

  usarComando(comando: string): void {
    this.texto.set(comando + ' ');
  }

  private ejecutar(peticion: ReturnType<ComandosService['confirmar']>): void {
    this.enviando.set(true);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => this.recibir(respuesta),
      error: () => {
        this.enviando.set(false);
        this.mensajes.update((lista) => [
          ...lista,
          { autor: 'sistema', texto: 'No se pudo completar la acción.' }
        ]);
      }
    });
  }

  private recibir(respuesta: RespuestaComando): void {
    this.enviando.set(false);
    this.pendiente.set(respuesta.requiereConfirmacion ? respuesta : null);

    const esNfc = respuesta.comando === '/nfc-estado';

    this.mensajes.update((lista) => [
      ...lista,
      {
        autor: 'sistema',
        texto: respuesta.mensaje,
        comando: respuesta.comando,
        confirmacion: respuesta.requiereConfirmacion ? respuesta : undefined,
        nfc: esNfc ? this.estadoNfc() ?? undefined : undefined
      }
    ]);

    if (esNfc) this.cargarEstadoNfc();
  }

  private cargarEstadoNfc(): void {
    this.toques.estado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estado) => {
          this.estadoNfc.set(estado);
          this.mensajes.update((lista) => {
            const copia = [...lista];
            const ultimo = copia.length - 1;

            if (ultimo >= 0 && copia[ultimo].comando === '/nfc-estado') {
              copia[ultimo] = { ...copia[ultimo], nfc: estado };
            }

            return copia;
          });
        },
        error: () => this.estadoNfc.set(null)
      });
  }

  activarEmision(): void {
    void this.router.navigate(['/app/emisora'], { queryParams: { activar: '1' } });
  }

  private cargarBots(): void {
    this.comandos.getBots(this.conversacionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bots) => this.bots.set(bots),
        error: () => this.bots.set([])
      });
  }
}

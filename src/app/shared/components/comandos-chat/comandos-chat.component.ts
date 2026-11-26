import { Component, DestroyRef, Input, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { BotComando } from '../../../core/models/comando.model';
import { ComandosService } from '../../../core/services/comandos.service';

interface MensajeComando {
  autor: 'yo' | 'ia';
  texto: string;
  comando?: string | null;
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

  readonly cerrar = output<void>();
  readonly usar = output<string>();

  private comandos = inject(ComandosService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly mensajes = signal<MensajeComando[]>([]);
  readonly texto = signal('');
  readonly enviando = signal(false);

  readonly vista = signal<'bots' | 'ia' | 'ayuda'>('bots');
  readonly bots = signal<BotComando[]>([]);
  readonly modoIa = signal(false);
  readonly copiado = signal<string | null>(null);

  readonly modoTraduciendo = computed(() => this.modoIa() && this.enviando());
  readonly hayBotsActivos = computed(() => this.bots().some((bot) => bot.activo));

  readonly atajos = [
    { comando: '@listar', texto: 'ver todos los comandos' },
    { comando: '/equipo-listar', texto: 'mis equipos' },
    { comando: '/gmail-buscar', texto: 'buscar un correo' },
    { comando: '/gdrive-buscar', texto: 'buscar en Drive' },
  ];

  ngOnInit(): void {
    this.cargarBots();
  }

  abrirVista(vista: 'bots' | 'ia' | 'ayuda'): void {
    this.vista.set(this.vista() === vista ? 'bots' : vista);
  }

  verComandos(): void {
    void this.router.navigate(['/app/ajustes'], { queryParams: { tab: 'comandos' } });
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
            { autor: 'ia', texto: 'La ayuda con IA no respondió. Prueba más tarde.' }
          ]);
        }
      });
  }

  usarComando(comando: string): void {
    this.usar.emit(comando.startsWith('@') ? comando : comando + ' ');
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

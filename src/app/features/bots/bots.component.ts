import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Bot,
  BotsService,
  EstadoGoogle,
  HerramientaBot,
  MensajeBot
} from '../../core/services/bots.service';

@Component({
  selector: 'app-bots',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bots.component.html',
  styleUrl: './bots.component.scss'
})
export class BotsComponent implements OnInit {

  private servicio = inject(BotsService);
  private ruta = inject(ActivatedRoute);
  private router = inject(Router);

  bots = signal<Bot[]>([]);
  bot = signal<Bot | null>(null);
  mensajes = signal<MensajeBot[]>([]);
  herramientas = signal<HerramientaBot[]>([]);
  google = signal<EstadoGoogle | null>(null);

  borrador = '';

  readonly sugerencias = [
    'Agenda una reunión el martes a las 10 con ana@ejemplo.com',
    '¿Qué tengo esta semana?',
    'Crea una hoja llamada Gastos de noviembre',
    'Muéstrame mis eventos de mañana'
  ];
  cargando = signal(false);
  enviando = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('botId');
    const estado = this.ruta.snapshot.queryParamMap.get('google');

    if (estado === 'ok') this.aviso.set('Google quedó conectado.');
    if (estado === 'error') this.error.set('No se pudo conectar Google. Inténtalo otra vez.');

    if (id) {
      this.abrir(id);
    } else {
      this.cargarLista();
    }
  }

  cargarLista(): void {
    this.cargando.set(true);
    this.servicio.listar().subscribe({
      next: (lista) => {
        this.bots.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pude cargar tus bots.');
        this.cargando.set(false);
      }
    });
  }

  abrir(id: string): void {
    this.cargando.set(true);

    this.servicio.obtener(id).subscribe({
      next: (b) => {
        this.bot.set(b);
        this.cargando.set(false);
        this.cargarMensajes(id);
        this.cargarHerramientas(id);
        this.cargarGoogle(id);
      },
      error: () => {
        this.error.set('Ese bot no existe o no es tuyo.');
        this.cargando.set(false);
        this.router.navigate(['/app/bots']);
      }
    });
  }

  cargarMensajes(id: string): void {
    this.servicio.mensajes(id).subscribe({
      next: (lista) => this.mensajes.set(lista),
      error: () => this.mensajes.set([])
    });
  }

  cargarHerramientas(id: string): void {
    this.servicio.herramientas(id).subscribe({
      next: (lista) => this.herramientas.set(lista),
      error: () => this.herramientas.set([])
    });
  }

  cargarGoogle(id: string): void {
    this.servicio.estadoGoogle(id).subscribe({
      next: (estado) => this.google.set(estado),
      error: () => this.google.set(null)
    });
  }

  hayHerramientas(): boolean {
    return this.herramientas().length > 0;
  }

  hayMensajes(): boolean {
    return this.mensajes().length > 0;
  }

  usarSugerencia(texto: string): void {
    this.borrador = texto;
  }

  enviar(): void {
    const bot = this.bot();
    const texto = this.borrador.trim();
    if (!bot || !texto || this.enviando()) return;

    this.enviando.set(true);
    this.borrador = '';

    this.servicio.conversar(bot.id, texto).subscribe({
      next: (nuevos) => {
        this.mensajes.set(nuevos);
        this.enviando.set(false);
      },
      error: () => {
        this.error.set('El bot no respondió. Inténtalo otra vez.');
        this.enviando.set(false);
      }
    });
  }

  conectarGoogle(): void {
    const bot = this.bot();
    if (!bot) return;

    this.servicio.urlGoogle(bot.id).subscribe({
      next: (r) => {
        window.location.href = r.url;
      },
      error: () => this.error.set('No pude abrir la autorización de Google.')
    });
  }

  desconectarGoogle(): void {
    const bot = this.bot();
    if (!bot) return;

    this.servicio.desconectarGoogle(bot.id).subscribe({
      next: () => {
        this.aviso.set('Google quedó desconectado.');
        this.cargarGoogle(bot.id);
        this.cargarHerramientas(bot.id);
      },
      error: () => this.error.set('No pude desconectar Google.')
    });
  }

  alternar(nombre: string, habilitada: boolean): void {
    const bot = this.bot();
    if (!bot) return;

    this.servicio.activarHerramienta(bot.id, nombre, habilitada).subscribe({
      next: () => this.cargarHerramientas(bot.id),
      error: () => this.error.set('No pude cambiar esa herramienta.')
    });
  }

  crear(): void {
    const nombre = prompt('¿Cómo se llama el bot?');
    if (!nombre || !nombre.trim()) return;

    this.servicio.crear({ nombre: nombre.trim(), activo: true }).subscribe({
      next: (b) => this.router.navigate(['/app/bots', b.id]),
      error: () => this.error.set('No pude crear el bot.')
    });
  }

  volver(): void {
    this.router.navigate(['/app/bots']);
  }
}

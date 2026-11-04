import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ChatService } from '../../core/services/chat.service';
import { ConnectionService } from '../../core/services/connection.service';
import { Conversacion } from '../../core/models/chat.model';
import { ConexionDto } from '../../core/models/perfil.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  private chatService = inject(ChatService);
  private connectionService = inject(ConnectionService);

  cargando = signal(true);
  enviando = signal(false);
  error = signal<string | null>(null);

  conversaciones = signal<Conversacion[]>([]);
  actual = signal<Conversacion | null>(null);
  texto = '';

  // Nueva conversación
  nuevoAbierto = signal(false);
  contactos = signal<ConexionDto[]>([]);
  buscador = '';
  destino = signal<ConexionDto | null>(null);
  textoNuevo = '';

  ngOnInit(): void {
    this.cargar();
  }

  // ====== carga ======

  cargar(): void {
    this.cargando.set(true);

    this.chatService.listar().subscribe({
      next: (lista) => {
        this.conversaciones.set(lista ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudieron cargar tus conversaciones.');
      },
    });
  }

  abrir(c: Conversacion): void {
    this.error.set(null);

    this.chatService.abrir(c.id).subscribe({
      next: (completa) => {
        this.actual.set(completa);
        this.texto = '';
        this.recargarLista();
      },
      error: () => this.error.set('No se pudo abrir la conversación.'),
    });
  }

  private recargarLista(): void {
    this.chatService.listar().subscribe((lista) => this.conversaciones.set(lista ?? []));
  }

  // ====== enviar / responder ======

  enviar(): void {
    const conv = this.actual();
    const mensaje = this.texto.trim();

    if (!conv || !mensaje || this.enviando()) return;

    this.enviando.set(true);
    this.error.set(null);

    this.chatService.responder(conv.id, mensaje).subscribe({
      next: (actualizada) => {
        this.actual.set(actualizada);
        this.texto = '';
        this.enviando.set(false);
        this.recargarLista();
      },
      error: (err) => {
        this.enviando.set(false);
        this.error.set(err?.error?.error || 'No se pudo enviar el mensaje.');
      },
    });
  }

  // ====== decisión de la solicitud ======

  aceptar(): void {
    const conv = this.actual();
    if (!conv) return;

    this.chatService.aceptar(conv.id).subscribe({
      next: (actualizada) => {
        this.actual.set(actualizada);
        this.recargarLista();
      },
      error: () => this.error.set('No se pudo aceptar la solicitud.'),
    });
  }

  rechazar(): void {
    const conv = this.actual();
    if (!conv) return;

    this.chatService.rechazar(conv.id).subscribe({
      next: (actualizada) => {
        this.actual.set(actualizada);
        this.recargarLista();
      },
      error: () => this.error.set('No se pudo rechazar la solicitud.'),
    });
  }

  reportar(): void {
    const conv = this.actual();
    if (!conv) return;

    const motivo = window.prompt('¿Por qué reportas esta conversación?', 'Mensajes no deseados');
    if (motivo === null) return;

    this.chatService.reportar(conv.id, motivo).subscribe({
      next: (actualizada) => {
        this.actual.set(actualizada);
        this.recargarLista();
      },
      error: () => this.error.set('No se pudo reportar la conversación.'),
    });
  }

  eliminar(): void {
    const conv = this.actual();
    if (!conv) return;
    if (!window.confirm('¿Eliminar esta conversación de tu lista?')) return;

    this.chatService.eliminar(conv.id).subscribe({
      next: () => {
        this.actual.set(null);
        this.cargar();
      },
      error: () => this.error.set('No se pudo eliminar la conversación.'),
    });
  }

  // ====== nueva conversación ======

  abrirNuevo(): void {
    this.nuevoAbierto.set(true);
    this.destino.set(null);
    this.textoNuevo = '';
    this.buscador = '';

    this.connectionService.getMyFollowing().subscribe({
      next: (lista) => this.contactos.set(lista ?? []),
      error: () => this.contactos.set([]),
    });
  }

  cerrarNuevo(): void {
    this.nuevoAbierto.set(false);
  }

  readonly filtrados = computed(() => {
    const q = this.buscador.trim().toLowerCase();
    if (!q) return this.contactos();

    return this.contactos().filter((c) =>
      (this.nombreDe(c) ?? '').toLowerCase().includes(q)
    );
  });

  elegir(c: ConexionDto): void {
    this.destino.set(c);
  }

  nombreDe(c: ConexionDto): string {
    return c.nombreContact ?? c.usernameContact ?? c.contactId;
  }

  enviarNuevo(): void {
    const c = this.destino();
    const mensaje = this.textoNuevo.trim();

    if (!c || !mensaje || this.enviando()) return;

    this.enviando.set(true);

    this.chatService.enviar(c.contactId, mensaje).subscribe({
      next: (conv) => {
        this.enviando.set(false);
        this.nuevoAbierto.set(false);
        this.textoNuevo = '';
        this.actual.set(conv);
        this.recargarLista();
      },
      error: (err) => {
        this.enviando.set(false);
        this.error.set(err?.error?.error || 'No se pudo iniciar la conversación.');
      },
    });
  }

  // ====== helpers de vista ======

  iniciales(nombre: string | undefined): string {
    const n = (nombre ?? '').trim();
    if (!n) return '?';

    const partes = n.split(/\s+/);
    return partes.length > 1
      ? (partes[0][0] + partes[1][0]).toUpperCase()
      : n.substring(0, 2).toUpperCase();
  }

  hora(fecha: string | undefined): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  esMio(senderId: string): boolean {
    return senderId === this.yoId();
  }

  /** id del usuario logueado, desde el token guardado. */
  private yoId(): string {
    try {
      const token = localStorage.getItem('token') ?? '';
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      return payload.id ?? payload.userId ?? payload.sub ?? '';
    } catch {
      return '';
    }
  }
}

import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EstadosComponent } from '../estados/estados.component';
import { Router } from '@angular/router';
import { SidePanelService } from '../../core/services/side-panel.service';
import { ContactsListComponent } from '../../shared/components/side-panel/components/contacts-list/contacts-list.component';
import { ChatViewComponent } from '../../shared/components/side-panel/components/chat-view/chat-view.component';
import { EstadosService } from '../../core/services/estados.service';
import { EstadosCreadorComponent } from '../estados/estados-creador.component';
import { EstadosVisorComponent } from '../estados/estados-visor.component';
import { GrupoEstados } from '../../core/models/estado.model';
import { PrivacidadService } from '../../core/services/privacidad.service';
import { NotasUsuarioComponent } from '../../shared/components/notas-usuario/notas-usuario.component';
import { Presencia } from '../../core/models/privacidad.model';

/**
 * Mensajes a página completa: la misma bandeja y el mismo hilo del panel, pero
 * en dos columnas (lista a la izquierda, conversación a la derecha).
 *
 * Es la vista a la que salta el botón de pantalla completa del chat minimizado.
 * Al salir se vuelve al panel en forma de ventana.
 */
@Component({
  selector: 'app-mensajes',
  standalone: true,
  imports: [CommonModule, ContactsListComponent, ChatViewComponent, EstadosCreadorComponent, EstadosVisorComponent, NotasUsuarioComponent, EstadosComponent, RouterLink],
  templateUrl: './mensajes.component.html',
  styleUrls: ['./mensajes.component.scss'],
})
export class MensajesComponent implements OnInit, OnDestroy {
  readonly svc = inject(SidePanelService);
  private readonly router = inject(Router);
  private readonly estados = inject(EstadosService);

  private readonly privacidadSvc = inject(PrivacidadService);

  readonly presenciaContacto = signal<Presencia>('EN_LINEA');
  readonly estadosDelContacto = signal<GrupoEstados | null>(null);
  readonly vistaAmplia = signal(false);
  readonly creadorAbierto = signal(false);
  readonly visorAbierto = signal(false);

  readonly tieneEstado = computed(() => {
    const grupo = this.estadosDelContacto();

    return !!grupo && grupo.estados.length > 0;
  });

  constructor() {
    effect(() => {
      const contacto = this.svc.activeContact();

      if (!contacto) {
        this.estadosDelContacto.set(null);
        return;
      }

      this.cargarEstados(contacto.id);
      this.cargarPresencia(contacto.id);
    });
  }

  readonly nota = signal<string | null>(this.leerNota());

  leerNota(): string | null {
    try {
      return localStorage.getItem('nsoft.nota');
    } catch {
      return null;
    }
  }

  guardarNota(texto: string | null): void {
    const limpio = (texto ?? '').trim();

    this.nota.set(limpio || null);

    try {
      if (limpio) {
        localStorage.setItem('nsoft.nota', limpio);
      } else {
        localStorage.removeItem('nsoft.nota');
      }
    } catch {
      return;
    }
  }

  notaContacto(): string | null {
    return this.estadosDelContacto()?.estados[0]?.texto?.trim() || null;
  }

  cargarPresencia(usuarioId: string): void {
    this.privacidadSvc.presenciaDe(usuarioId).subscribe({
      next: (presencia) => this.presenciaContacto.set(presencia),
      error: () => this.presenciaContacto.set('EN_LINEA'),
    });
  }

  textoPresencia(): string {
    switch (this.presenciaContacto()) {
      case 'AUSENTE': return 'Ausente';
      case 'NO_MOLESTAR': return 'No molestar';
      case 'INVISIBLE': return 'Desconectado';
      default: return 'En línea';
    }
  }

  cargarEstados(usuarioId: string): void {
    this.estados.deUsuario(usuarioId).subscribe({
      next: (grupo) => this.estadosDelContacto.set(grupo),
      error: () => this.estadosDelContacto.set(null),
    });
  }

  abrirEstado(): void {
    if (this.tieneEstado()) {
      this.visorAbierto.set(true);
      return;
    }

    this.creadorAbierto.set(true);
  }

  cerrarVisor(): void {
    this.visorAbierto.set(false);

    const contacto = this.svc.activeContact();

    if (contacto) {
      this.cargarEstados(contacto.id);
    }
  }

  /** Con una conversación elegida, en móvil se oculta la lista. */
  chatAbierto(): boolean {
    return this.svc.activeView() === 'chat' && !!this.svc.activeContact();
  }

  ngOnInit(): void {
    // Esta página manda: el panel flotante se aparta mientras estemos aquí.
    this.svc.cerrarPanelFlotante();
    this.svc.cargarConversaciones();
    this.observarAncho();
  }

  ngOnDestroy(): void {
    this.quitarAncho?.();
    // Se sale por donde se salga (riel, atrás, un enlace): la pastilla vuelve.
    this.svc.salirDePaginaCompleta();
  }

  private quitarAncho?: () => void;

  private observarAncho(): void {
    if (typeof window === 'undefined') return;

    const medir = () => this.vistaAmplia.set(window.innerWidth >= 1180);

    medir();
    window.addEventListener('resize', medir);
    this.quitarAncho = () => window.removeEventListener('resize', medir);
  }

  volver(): void {
    this.svc.backToContacts();
  }

  /** El "Volver" de la cabecera: sale de "Nuevo mensaje" o de la conversación. */
  volverALista(): void {
    this.svc.cerrarVistaNueva();
    this.svc.backToContacts();
  }

  /**
   * "Poner pequeño": se regresa a la página donde estaba el usuario y el chat
   * vuelve a ser la cápsula minimizada.
   */
  salir(): void {
    const anterior = this.svc.paginaAnterior();
    this.svc.volverAVentana();

    if (anterior && anterior !== '/app/mensajes') {
      this.router.navigateByUrl(anterior);
      return;
    }
    window.history.length > 1 ? window.history.back() : this.router.navigate(['/app']);
  }

  iniciales(nombre: string | undefined): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }
}

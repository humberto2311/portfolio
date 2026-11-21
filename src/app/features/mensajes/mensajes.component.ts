import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SidePanelService } from '../../core/services/side-panel.service';
import { ContactsListComponent } from '../../shared/components/side-panel/components/contacts-list/contacts-list.component';
import { ChatViewComponent } from '../../shared/components/side-panel/components/chat-view/chat-view.component';

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
  imports: [ContactsListComponent, ChatViewComponent],
  templateUrl: './mensajes.component.html',
  styleUrls: ['./mensajes.component.scss'],
})
export class MensajesComponent implements OnInit, OnDestroy {
  readonly svc = inject(SidePanelService);
  private readonly router = inject(Router);

  /** Con una conversación elegida, en móvil se oculta la lista. */
  chatAbierto(): boolean {
    return this.svc.activeView() === 'chat' && !!this.svc.activeContact();
  }

  ngOnInit(): void {
    // Esta página manda: el panel flotante se aparta mientras estemos aquí.
    this.svc.cerrarPanelFlotante();
    this.svc.cargarConversaciones();
  }

  ngOnDestroy(): void {
    // Se sale por donde se salga (riel, atrás, un enlace): la pastilla vuelve.
    this.svc.salirDePaginaCompleta();
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

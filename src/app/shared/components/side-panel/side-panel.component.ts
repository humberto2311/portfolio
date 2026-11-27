import { Component, inject, signal } from '@angular/core';
import { NotasPersonasService } from '../../../core/services/notas-personas.service';
import { take } from 'rxjs/operators';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { ZumbidoService } from '../../../core/services/zumbido.service';
import { ChatService } from '../../../core/services/chat.service';
import { FloatingButtonsComponent } from './components/floating-buttons/floating-buttons.component';
import { ContactsListComponent } from './components/contacts-list/contacts-list.component';
import { ChatViewComponent } from './components/chat-view/chat-view.component';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [FloatingButtonsComponent, ContactsListComponent, ChatViewComponent], 
  templateUrl: './side-panel.component.html',
  styleUrls: ['./side-panel.component.scss'],
})
export class SidePanelComponent {

  enviarZumbido(): void {
    const contacto = this.svc.activeContact();
    const conversacionId = contacto?.conversationId;

    if (!conversacionId || this.zumbido.enEspera) return;

    this.zumbido.enviar(contacto?.name ?? '');
    this.svc.agregarZumbido(true);

    this.chat
      .zumbido(conversacionId)
      .pipe(take(1))
      .subscribe({
        error: () => this.zumbido.espera.set(0),
      });
  }


  private readonly notas = inject(NotasPersonasService);

  notaDe(contact: { id: string } | null): string {
    if (!contact) return '';

    this.notas.pedir(contact.id);

    return this.notas.nota(contact.id);
  }
  svc = inject(SidePanelService);
  readonly zumbido = inject(ZumbidoService);
  private readonly chat = inject(ChatService);

  /**
   * Dos estados: la ventana (420 px, con el fondo a la vista), o pantalla
   * completa. La X de la cabecera solo actúa dentro de un chat/PDF, así que
   * nunca deja el panel sin salida.
   */
  /** Sin leer, para el contador rojo del título (como Instagram). */
  get sinLeer(): number {
    return this.svc.sinLeer();
  }

  get ampliado(): boolean {
    return !this.svc.modoVentana();
  }

  alternarAmpliado(): void {
    this.svc.alternarModoVentana();
  }

  volverAMensajes(): void {
    this.svc.volverAMensajes();
  }
}
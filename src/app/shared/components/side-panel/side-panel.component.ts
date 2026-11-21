import { Component, inject, signal } from '@angular/core';
import { SidePanelService } from '../../../core/services/side-panel.service';
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
  svc = inject(SidePanelService);

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
}
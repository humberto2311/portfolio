import { Component, inject } from '@angular/core';
import { SidePanelService } from '../../../../../core/services/side-panel.service';

/** Contenedor del panel lateral. Los botones flotantes se movieron a la barra
 *  superior y al menú del avatar, así que este componente ya no los dibuja. */
@Component({
  selector: 'app-floating-buttons',
  standalone: true,
  template: '',
})
export class FloatingButtonsComponent {
  svc = inject(SidePanelService);
}

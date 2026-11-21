import { Component, HostListener, inject } from '@angular/core';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { PdfUploadComponent } from '../../../shared/components/side-panel/components/pdf-upload/pdf-upload.component';

/**
 * Importar hoja de vida en un modal centrado (antes vivía dentro del panel de
 * Mensajes, donde parecía una conversación más). El estado lo sigue llevando el
 * panel: `svc.importandoCv()` dice cuándo está abierto.
 */
@Component({
  selector: 'app-importar-cv',
  standalone: true,
  imports: [PdfUploadComponent],
  templateUrl: './importar-cv.component.html',
  styleUrls: ['./importar-cv.component.scss'],
})
export class ImportarCvComponent {
  readonly svc = inject(SidePanelService);

  cerrar(): void {
    this.svc.cerrarPdf();
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    if (this.svc.importandoCv()) this.cerrar();
  }
}

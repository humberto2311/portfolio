import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { EmpresaService } from '../../../core/services/empresa.service';

/**
 * Pastilla de Mensajes (estilo Instagram): vive en la esquina inferior derecha,
 * arriba de la barra de pestañas en móvil. Al pulsarla abre el panel de chats.
 *
 * Si el panel está abierto, la pastilla se convierte en una burbuja con el
 * contador y su propio "ver todas": así el panel tiene su salida siempre a mano
 * sin ocupar la barra superior.
 */
@Component({
  selector: 'app-mensajes-pastilla',
  standalone: true,
  templateUrl: './mensajes-pastilla.component.html',
  styleUrls: ['./mensajes-pastilla.component.scss'],
})
export class MensajesPastillaComponent {
  private router = inject(Router);
  readonly svc = inject(SidePanelService);
  readonly empresa = inject(EmpresaService);

  /** Con el panel abierto la pastilla se marca como activa, pero nunca se esconde. */
  readonly activa = computed(() => this.svc.isOpen());

  /** En modo empresa los chats personales no aplican: la pastilla se esconde. */
  /**
   * La pastilla cede su sitio al panel: con Mensajes abierto no se muestra y
   * vuelve en cuanto se cierra (X, Esc o tocar fuera).
   */
  get visible(): boolean {
    // En la página de Mensajes a pantalla completa no hay pastilla: el propio
    // componente trae su botón de contraer.
    if (this.svc.enPaginaCompleta()) return false;
    return this.svc.pastillaVisible(false) && !this.svc.isOpen() && !this.svc.pastillaOculta();
  }

  get sinLeer(): number {
    return this.svc.sinLeer();
  }

  get etiqueta(): string {
    const n = this.sinLeer;
    return n > 0 ? `${n} sin abrir` : 'Mensajes';
  }

  ocultar(): void {
    this.svc.ocultarPastilla();
  }

  abrir(): void {
    this.svc.openContacts();
  }

  /** Lápiz: buscar a alguien y empezar una charla nueva. */
  nuevoMensaje(evento: Event): void {
    evento.stopPropagation();
    this.svc.abrirVistaNueva();
  }

  /** ⤢: Mensajes a página completa, en su propio componente. */
  pantallaCompleta(evento: Event): void {
    evento.stopPropagation();
    this.svc.abrirPantallaCompleta();
  }

  /** Ver todas: abre la bandeja (o la cierra si ya estaba en contactos). */
  verTodas(evento: Event): void {
    evento.stopPropagation();
    this.svc.alternarMensajes();
  }

  irAjustes(evento: Event): void {
    evento.stopPropagation();
    this.svc.close();
    this.router.navigate(['/app/ajustes/cuenta']);
  }
}

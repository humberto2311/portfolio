import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { SidePanelService } from '../../../../../core/services/side-panel.service';
import { ChatService } from '../../../../../core/services/chat.service';
import { ConfirmationModalService } from '../../../../../core/services/confirmation-modal.service';
import { ChatMessage } from '../../../../../core/models/chat.model';
import { Contact } from '../../../../../core/models/contact.model';
import { ComandosChatComponent } from '../../../comandos-chat/comandos-chat.component';
import { ComandosService } from '../../../../../core/services/comandos.service';
import {
  MensajesProgramadosService,
  TipoProgramacion,
} from '../../../../../core/services/mensajes-programados.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { CatalogoComandos, RespuestaComando } from '../../../../../core/models/comando.model';

interface GrupoMensajes {
  clave: string;
  mio: boolean;
  comando: boolean;
  mensajes: ChatMessage[];
}

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ComandosChatComponent],
  templateUrl: './chat-view.component.html',
  styleUrls: ['./chat-view.component.scss'],
})
export class ChatViewComponent {
  svc = inject(SidePanelService);
  private chatService = inject(ChatService);
  private confirmationModal = inject(ConfirmationModalService);
  private comandos = inject(ComandosService);
  private programados = inject(MensajesProgramadosService);
  private toasts = inject(ToastService);

  message = signal('');
  readonly panelComandos = signal(false);
  readonly sugerencias = signal<CatalogoComandos['comandos']>([]);
  readonly ejecutandoComando = signal(false);
  readonly comandoPendiente = signal<RespuestaComando | null>(null);
  sending = signal(false);

  /** Mantener pulsado el botón de enviar abre la programación del mensaje. */
  private temporizadorPulsacion: ReturnType<typeof setTimeout> | null = null;
  private pulsacionLarga = false;
  readonly programarAbierto = signal(false);
  readonly tipoProgramacion = signal<TipoProgramacion>('UNA_VEZ');
  readonly modoUnaVez = signal<'TIEMPO' | 'FECHA'>('TIEMPO');
  readonly minutosProgramados = signal<number | null>(60);
  readonly diaProgramado = signal<number | null>(null);
  readonly mesProgramado = signal<number | null>(null);
  readonly anioProgramado = signal<number | null>(null);
  readonly horaProgramada = signal<number | null>(null);
  readonly minutoProgramado = signal<number | null>(0);
  readonly guardandoProgramacion = signal(false);
  readonly errorProgramar = signal<string | null>(null);
  cargando = signal(false);
  editingId = signal<string | null>(null);
  error = signal<string | null>(null);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  readonly abiertoId = signal<string | null>(null);

  readonly reacciones = signal<Record<string, string>>({});

  empezarPulsacion(evento: PointerEvent): void {
    this.pulsacionLarga = false;
    this.cancelarPulsacion();

    this.temporizadorPulsacion = setTimeout(() => {
      this.pulsacionLarga = true;
      this.abrirProgramacion();
    }, 550);
  }

  terminarPulsacion(): void {
    // Si ya se abrió el panel de programar, este clic no debe enviar el mensaje.
    if (this.pulsacionLarga) {
      this.pulsacionLarga = false;
      setTimeout(() => this.cancelarPulsacion(), 0);
    } else {
      this.cancelarPulsacion();
    }
  }

  cancelarPulsacion(): void {
    if (this.temporizadorPulsacion) {
      clearTimeout(this.temporizadorPulsacion);
      this.temporizadorPulsacion = null;
    }
  }

  readonly previsualizacion = computed(() => {
    if (this.modoUnaVez() === 'TIEMPO') {
      const minutos = this.minutosProgramados() ?? 60;
      const cuando = new Date(Date.now() + minutos * 60000);
      return `${this.distancia(minutos)} · ${this.formato(cuando)}`;
    }

    const fecha = this.fechaElegida();
    if (!fecha) return 'Elige día, mes, año y hora';
    return this.formato(fecha);
  });

  private isoFecha(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  private isoHora(fecha: Date): string {
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minuto = String(fecha.getMinutes()).padStart(2, '0');
    return `${hora}:${minuto}`;
  }

  private distancia(minutos: number): string {
    if (minutos < 60) return `en ${minutos} min`;
    if (minutos === 60) return 'en 1 hora';
    if (minutos < 1440) return `en ${minutos / 60} horas`;
    return 'en 24 horas';
  }

  private formato(fecha: Date): string {
    return fecha.toLocaleString('es-CO', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private fechaElegida(): Date | null {
    const dia = this.diaProgramado();
    const mes = this.mesProgramado();
    const anio = this.anioProgramado();
    const hora = this.horaProgramada() ?? 0;
    const minuto = this.minutoProgramado() ?? 0;

    if (!dia || !mes || !anio) return null;
    if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null;

    const fecha = new Date(anio, mes - 1, dia, hora, minuto);
    if (fecha.getDate() !== dia || fecha.getMonth() !== mes - 1) return null;
    return fecha;
  }

  cambiarTipoProgramacion(tipo: TipoProgramacion): void {
    this.tipoProgramacion.set(tipo);
    if (tipo !== 'UNA_VEZ') {
      this.modoUnaVez.set('FECHA');
    }
    this.llenarFechaDeHoy();
  }

  private llenarFechaDeHoy(): void {
    const ahora = new Date();
    if (!this.diaProgramado()) this.diaProgramado.set(ahora.getDate());
    if (!this.mesProgramado()) this.mesProgramado.set(ahora.getMonth() + 1);
    if (!this.anioProgramado()) this.anioProgramado.set(ahora.getFullYear());
    if (this.horaProgramada() === null) this.horaProgramada.set(ahora.getHours() + 1);
  }

  cambiarModoUnaVez(modo: 'TIEMPO' | 'FECHA'): void {
    this.modoUnaVez.set(modo);
    if (modo === 'FECHA') this.llenarFechaDeHoy();
  }

  abrirProgramacion(): void {
    this.errorProgramar.set(null);
    this.programarAbierto.set(true);
  }

  guardarProgramacion(): void {
    const contacto = this.svc.activeContact();

    if (!contacto) {
      this.errorProgramar.set('Abre un chat para programar el mensaje.');
      return;
    }
    if (!this.message().trim()) {
      this.errorProgramar.set('Escribe el mensaje antes de programarlo.');
      return;
    }

    const tipo = this.tipoProgramacion();
    const porTiempo = this.modoUnaVez() === 'TIEMPO';
    const minutos = porTiempo ? this.minutosProgramados() : null;
    const fecha = porTiempo ? null : this.fechaElegida();

    if (!porTiempo && !fecha) {
      this.errorProgramar.set('Revisa el día, el mes y la hora: esa fecha no existe.');
      return;
    }
    if (fecha && fecha.getTime() <= Date.now()) {
      this.errorProgramar.set('Esa fecha ya pasó. Elige una hora futura.');
      return;
    }

    this.guardandoProgramacion.set(true);
    this.errorProgramar.set(null);

    this.programados.programar({
      destinatarioId: contacto.id,
      contenido: this.message().trim(),
      tipo,
      minutos: minutos ?? undefined,
      fecha: fecha ? this.isoFecha(fecha) : undefined,
      hora: fecha ? this.isoHora(fecha) : undefined,
      diaSemana: tipo === 'SEMANAL' ? new Date().getDay() || 7 : undefined,
      diaMes: tipo === 'MENSUAL' ? new Date().getDate() : undefined,
    }).subscribe({
      next: (guardado) => {
        this.guardandoProgramacion.set(false);
        this.programarAbierto.set(false);
        this.message.set('');
        this.toasts.show(`Mensaje programado: ${guardado.etiqueta}`);
      },
      error: (respuesta) => {
        this.guardandoProgramacion.set(false);
        this.errorProgramar.set(
          respuesta?.error?.message ?? 'No se pudo programar el mensaje.'
        );
      }
    });
  }

  get textoListo(): boolean {
    return this.message().trim().length > 0;
  }

  conversacionActual(): string | null {
    return this.svc.activeContact()?.conversationId ?? null;
  }

  alternarPanelComandos(): void {
    this.panelComandos.set(!this.panelComandos());
  }

  cerrarPanelComandos(): void {
    this.panelComandos.set(false);
  }

  escribirComando(comando: string): void {
    this.message.set(comando);
    this.panelComandos.set(false);
    this.sugerencias.set([]);

    const campo = document.querySelector<HTMLTextAreaElement>('.composer__campo');
    if (campo) {
      campo.focus();
      campo.style.height = 'auto';
    }
  }

  claveDe(msg: ChatMessage): string {
    return String(msg.id ?? `${msg.time}-${msg.text}`);
  }

  reaccionDe(msg: ChatMessage): string | null {
    return this.reacciones()[this.claveDe(msg)] ?? null;
  }

  alternarReaccion(msg: ChatMessage, evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
    const clave = this.claveDe(msg);
    this.reacciones.update((mapa) => {
      const copia = { ...mapa };
      if (copia[clave]) delete copia[clave];
      else copia[clave] = '❤️';
      return copia;
    });
  }

  iniciales(nombre: string | undefined): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  abrirCamara(campo?: HTMLTextAreaElement): void {
    campo?.focus();
  }

  enviarLike(): void {
    this.message.set('❤️');
    this.send();
  }

  ajustarAlto(evento: Event): void {
    const campo = evento.target as HTMLTextAreaElement;
    campo.style.height = 'auto';
    const maximo = 4 * 20 + 20;
    campo.style.height = `${Math.min(campo.scrollHeight, maximo)}px`;
  }

  get grupos(): Array<{ clave: string; etiqueta: string; grupos: GrupoMensajes[] }> {
    const lista = this.messages;
    const porDia: Array<{ clave: string; etiqueta: string; grupos: GrupoMensajes[] }> = [];

    for (const msg of lista) {
      const fecha = this.fechaDe(msg);
      const claveDia = fecha ? fecha.toDateString() : 'sin-fecha';
      let dia = porDia[porDia.length - 1];
      if (!dia || dia.clave !== claveDia) {
        dia = { clave: claveDia, etiqueta: this.etiquetaDia(fecha), grupos: [] };
        porDia.push(dia);
      }

      const mio = msg.sender === 'me';
      let grupo = dia.grupos[dia.grupos.length - 1];
      if (!grupo || grupo.mio !== mio) {
        grupo = { clave: `${claveDia}-${dia.grupos.length}`, mio, comando: !!msg.comando, mensajes: [] };
        dia.grupos.push(grupo);
      }
      grupo.mensajes.push(msg);
    }

    return porDia;
  }

  ultimoDelHistorial(grupo: GrupoMensajes): boolean {
    const dias = this.grupos;
    const ultimoDia = dias[dias.length - 1];
    const ultimoGrupo = ultimoDia?.grupos[ultimoDia.grupos.length - 1];
    return ultimoGrupo?.clave === grupo.clave;
  }

  private fechaDe(msg: ChatMessage): Date | null {
    const valor = (msg as any).createdAt as string | undefined;
    if (!valor) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private etiquetaDia(fecha: Date | null): string {
    if (!fecha) return '';
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);

    const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (mismoDia(fecha, hoy)) return 'HOY';
    if (mismoDia(fecha, ayer)) return 'AYER';

    return fecha
      .toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
      .toUpperCase();
  }

  private ultimaCarga = '';

  constructor() {
    this.cargarCatalogo();

    effect(() => {
      this.svc.chatHistories();
      this.svc.typing();
      queueMicrotask(() => this.scrollToBottom());
    });

    effect(() => {
      this.svc.scrollAlFinal();
      untracked(() => queueMicrotask(() => this.scrollToBottom()));
    });

    effect(() => {
      const contact = this.svc.activeContact();
      const clave = contact ? `${contact.id}|${contact.conversationId ?? 'nueva'}` : '';
      if (!clave || clave === this.ultimaCarga) return;

      this.ultimaCarga = clave;
      untracked(() => this.cargarHistorial(contact!));
    });
  }

  get messages(): ChatMessage[] {
    const id = this.svc.activeContact()?.id;
    return id ? this.svc.chatHistories()[id] ?? [] : [];
  }

  trackMsg(msg: ChatMessage, index: number): string | number {
    return msg.id ?? `tmp-${index}-${msg.time}`;
  }

  get puedeEscribir(): boolean {
    const contact = this.svc.activeContact();
    if (!contact) return false;
    if (!contact.estado || contact.estado === 'ACEPTADA') return true;
    return contact.estado === 'PENDIENTE' && contact.soySolicitante === true;
  }

  get esSolicitudPendiente(): boolean {
    const contact = this.svc.activeContact();
    return contact?.estado === 'PENDIENTE' && contact?.esSolicitud === true;
  }

  get conversacionCerrada(): boolean {
    const estado = this.svc.activeContact()?.estado;
    return estado === 'RECHAZADA' || estado === 'REPORTADA';
  }

  get textoEsComando(): boolean {
    return this.message().trim().startsWith('/') || this.message().trim().startsWith('@');
  }

  send(): void {
    if (this.editingId()) {
      this.confirmEdit();
      return;
    }

    const text = this.message().trim();
    const contact = this.svc.activeContact();
    if (!text || !contact || !this.puedeEscribir) return;

    if (text.startsWith('/') || text.startsWith('@')) {
      this.ejecutarComando(text);
      return;
    }

    this.svc.sendMessage(text);
    this.message.set('');

    const campo = document.querySelector<HTMLTextAreaElement>('.composer__campo');
    if (campo) campo.style.height = 'auto';
    this.error.set(null);
    this.sending.set(true);

    if (contact.tipo && contact.tipo !== 'PERSONAL' && contact.empresaId && contact.conversationId) {
      this.chatService.enviarEmpresa(contact.empresaId, contact.conversationId, text).pipe(take(1)).subscribe({
        next: () => {
          this.sending.set(false);
          this.ultimaCarga = '';
          this.cargarHistorial(contact);
        },
        error: (err) => {
          this.sending.set(false);
          this.svc.setHistorial(
            contact.id,
            this.messages.filter(m => !(m.sender === 'me' && m.text === text && !m.id))
          );
          this.error.set(this.mensajeError(err, 'No se pudo enviar el mensaje'));
        },
      });
      return;
    }

    const peticion = contact.conversationId
      ? this.chatService.responder(contact.conversationId, text)
      : this.chatService.enviar(contact.id, text);

    peticion.pipe(take(1)).subscribe({
      next: (conversacion) => {
        this.sending.set(false);
        this.svc.aplicarConversacion(conversacion);
        this.ultimaCarga = `${contact.id}|${conversacion.id}`;
      },
      error: (err) => {
        this.sending.set(false);
        this.svc.setHistorial(
          contact.id,
          this.messages.filter(m => !(m.sender === 'me' && m.text === text && !m.id))
        );
        this.error.set(this.mensajeError(err, 'No se pudo enviar el mensaje'));
      },
    });
  }

  private ejecutarComando(texto: string): void {
    const contact = this.svc.activeContact();
    if (!contact || this.ejecutandoComando()) return;

    this.svc.agregarMensaje(contact.id, {
      sender: 'me',
      text: texto,
      time: this.hora(new Date().toISOString()),
    } as any);

    this.message.set('');
    this.sugerencias.set([]);
    this.ejecutandoComando.set(true);

    const campo = document.querySelector<HTMLTextAreaElement>('.composer__campo');
    if (campo) campo.style.height = 'auto';

    this.comandos.enviarMensaje(texto, contact.conversationId ?? null)
      .pipe(take(1))
      .subscribe({
        next: (respuesta) => this.recibirComando(respuesta),
        error: () => {
          this.ejecutandoComando.set(false);
          this.svc.agregarMensaje(contact.id, {
            sender: 'them',
            text: 'No pude ejecutar ese comando. Inténtalo otra vez.',
            time: this.hora(new Date().toISOString()),
            comando: true,
          } as any);
        },
      });
  }

  private recibirComando(respuesta: RespuestaComando): void {
    const contact = this.svc.activeContact();
    this.ejecutandoComando.set(false);
    if (!contact) return;

    this.comandoPendiente.set(respuesta.requiereConfirmacion ? respuesta : null);

    this.svc.agregarMensaje(contact.id, {
      sender: 'them',
      text: respuesta.mensaje,
      time: this.hora(new Date().toISOString()),
      comando: true,
      comandoNombre: respuesta.comando,
      confirmacion: respuesta.requiereConfirmacion,
      parametros: respuesta.parametros,
    } as any);
  }

  confirmarComando(): void {
    const contact = this.svc.activeContact();
    if (!contact) return;

    this.ejecutandoComando.set(true);
    this.comandos.confirmar(contact.conversationId ?? null)
      .pipe(take(1))
      .subscribe({
        next: (respuesta) => {
          this.comandoPendiente.set(null);
          this.recibirComando(respuesta);
        },
        error: () => this.ejecutandoComando.set(false),
      });
  }

  cancelarComando(): void {
    const contact = this.svc.activeContact();
    if (!contact) return;

    this.comandos.cancelar(contact.conversationId ?? null)
      .pipe(take(1))
      .subscribe({
        next: (respuesta) => {
          this.comandoPendiente.set(null);
          this.recibirComando(respuesta);
        },
        error: () => {},
      });
  }

  sugerenciasComando(): CatalogoComandos['comandos'] {
    const escrito = this.message().trim();
    if (!escrito.startsWith('/') || escrito.includes(' ')) return [];

    const prefijo = escrito.toLowerCase();
    return this.sugerencias()
      .filter((comando) => comando.nombre.toLowerCase().startsWith(prefijo))
      .slice(0, 6);
  }

  elegirSugerencia(nombre: string): void {
    this.message.set(nombre + ' ');
    const campo = document.querySelector<HTMLTextAreaElement>('.composer__campo');
    if (campo) campo.focus();
  }

  private cargarCatalogo(): void {
    this.comandos.getGuia().pipe(take(1)).subscribe({
      next: (catalogo) => this.sugerencias.set(catalogo.comandos),
      error: () => this.sugerencias.set([]),
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
    if (event.key === 'Escape' && this.editingId()) {
      this.cancelEdit();
    }
  }

  startEdit(msg: ChatMessage): void {
    if (!msg.id || !msg.canEdit) return;
    this.editingId.set(msg.id);
    this.message.set(msg.text);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.message.set('');
  }

  confirmEdit(): void {
    const id = this.editingId();
    const text = this.message().trim();
    const contact = this.svc.activeContact();
    if (!id || !text || !contact) return;

    this.error.set(null);
    this.chatService.editarMensaje(id, { content: text })
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.svc.actualizarMensaje(contact.id, this.svc.mensajeAUi(updated, contact.id));
          this.cancelEdit();
        },
        error: (err) =>
          this.error.set(this.mensajeError(err, 'No se pudo editar el mensaje')),
      });
  }

  async remove(msg: ChatMessage): Promise<void> {
    const contact = this.svc.activeContact();
    if (!msg.id || !contact) return;

    const confirmed = await this.confirmationModal.confirmDelete('este mensaje');
    if (!confirmed) return;

    this.error.set(null);
    this.chatService.borrarMensaje(msg.id)
      .pipe(take(1))
      .subscribe({
        next: (deleted) =>
          this.svc.actualizarMensaje(contact.id, this.svc.mensajeAUi(deleted, contact.id)),
        error: (err) =>
          this.error.set(this.mensajeError(err, 'No se pudo eliminar el mensaje')),
      });
  }

  aceptarSolicitud(): void {
    this.resolverSolicitud('aceptar');
  }

  rechazarSolicitud(): void {
    this.resolverSolicitud('rechazar');
  }

  reintentar(): void {
    const contact = this.svc.activeContact();
    if (!contact) return;
    this.ultimaCarga = '';
    this.cargarHistorial(contact);
  }

  private cargarHistorial(contact: Contact): void {
    if (!contact.conversationId) {

      if (!this.messages.length) this.svc.setHistorial(contact.id, []);
      return;
    }

    if (contact.tipo && contact.tipo !== 'PERSONAL' && contact.empresaId) {
      this.cargando.set(true);
      this.error.set(null);

      this.chatService.mensajesEmpresa(contact.empresaId, contact.conversationId).pipe(take(1)).subscribe({
        next: (mensajes) => {
          this.cargando.set(false);
          this.svc.setHistorial(
            contact.id,
            mensajes.map((mensaje) => ({
              id: mensaje.id,
              sessionId: mensaje.conversacionId,
              senderId: mensaje.autorId ?? '',
              senderName: mensaje.autorNombre ?? '',
              content: mensaje.contenido,
              createdAt: mensaje.creadoEn,
              sender: mensaje.propio ? 'me' : 'them',
              text: mensaje.contenido,
              time: this.hora(mensaje.creadoEn),
            })) as any,
          );
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(this.mensajeError(err, 'No se pudo cargar la conversación'));
        },
      });
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.chatService.abrir(contact.conversationId)
      .pipe(take(1))
      .subscribe({
        next: (conversacion) => {
          this.cargando.set(false);
          this.svc.aplicarConversacion(conversacion);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(this.mensajeError(err, 'No se pudo cargar la conversación'));
        },
      });
  }

  private hora(valor: string): string {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  private resolverSolicitud(accion: 'aceptar' | 'rechazar'): void {
    const contact = this.svc.activeContact();
    const conversacionId = contact?.conversationId;
    if (!contact || !conversacionId) return;

    this.error.set(null);
    const peticion = accion === 'aceptar'
      ? this.chatService.aceptar(conversacionId)
      : this.chatService.rechazar(conversacionId);

    peticion.pipe(take(1)).subscribe({
      next: (conversacion) => this.svc.aplicarConversacion(conversacion),
      error: (err) =>
        this.error.set(this.mensajeError(err, 'No se pudo responder la solicitud')),
    });
  }

  private mensajeError(err: any, porDefecto: string): string {
    const detalle = err?.error?.message ?? err?.error?.error;
    return typeof detalle === 'string' && detalle ? detalle : porDefecto;
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}

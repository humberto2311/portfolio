import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { SidePanelService } from '../../../../../core/services/side-panel.service';
import { ChatService } from '../../../../../core/services/chat.service';
import { Contact } from '../../../../../core/models/contact.model';
import { UsuarioBuscado } from '../../../../../core/models/chat.model';

@Component({
  selector: 'app-contacts-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacts-list.component.html',
  styleUrls: ['./contacts-list.component.scss'],
})
export class ContactsListComponent implements OnInit, OnDestroy {
  svc = inject(SidePanelService);
  private chat = inject(ChatService);

  search = signal('');
  personas = signal<UsuarioBuscado[]>([]);
  buscando = signal(false);

  private tecleo = new Subject<string>();

  constructor() {
    this.tecleo
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termino) =>
          termino.length < 2 ? of([] as UsuarioBuscado[]) : this.chat.buscarUsuarios(termino)
        )
      )
      .subscribe({
        next: (lista) => {
          this.personas.set(lista ?? []);
          this.buscando.set(false);
        },
        error: () => {
          this.personas.set([]);
          this.buscando.set(false);
        },
      });
  }

  ngOnInit(): void {
    this.svc.cargarConversaciones();
  }

  ngOnDestroy(): void {
    this.tecleo.complete();
  }

  /** Conversaciones que coinciden con lo que se está escribiendo. */
  get conversaciones(): Contact[] {
    const q = this.search().toLowerCase();
    if (!q) return this.svc.contacts();
    return this.svc.contacts().filter(
      c => c.name.toLowerCase().includes(q) || c.lastMsg.toLowerCase().includes(q)
    );
  }

  /** Personas sin conversación abierta, devueltas por el buscador de perfiles. */
  get sugerencias(): UsuarioBuscado[] {
    const conChats = new Set(this.svc.contacts().map(c => c.id));
    return this.personas().filter(p => !conChats.has(p.id) && p.id !== this.svc.miId);
  }

  select(contact: Contact): void {
    this.svc.openChat(contact);
  }

  /** La conversación con esa persona nace con el primer mensaje, en ChatView. */
  seleccionarPersona(persona: UsuarioBuscado): void {
    const existente = this.svc.buscarContacto(persona.id);
    if (existente) {
      this.svc.openChat(existente);
      return;
    }

    this.svc.openChat({
      id: persona.id,
      name: persona.fullName || persona.gitUsername || 'Usuario',
      avatar: '',
      status: 'offline',
      statusText: persona.gitUsername ? `@${persona.gitUsername}` : '',
      lastMsg: '',
      time: '',
      unread: 0,
      gitUsername: persona.gitUsername ?? undefined,
    });
  }

  iniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  onSearch(value: string): void {
    const termino = value.trim();
    this.search.set(termino);
    this.buscando.set(termino.length >= 2);
    this.tecleo.next(termino);
  }
}

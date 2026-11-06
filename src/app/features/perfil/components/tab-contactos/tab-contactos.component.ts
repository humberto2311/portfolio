import { Component, OnInit, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConnectionService } from '../../../../core/services/connection.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SidePanelService } from '../../../../core/services/side-panel.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-tab-contactos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tab-contactos.component.html',
  styleUrls: ['./tab-contactos.component.scss']
})
export class TabContactosComponent implements OnInit, OnChanges {
  @Input() userId!: string; 
  @Input() esMiPerfil = false;

  private connectionService = inject(ConnectionService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private sidePanel = inject(SidePanelService);
  private auth = inject(AuthService);

  activeSubTab: 'seguidos' | 'seguidores' = 'seguidos';
  
  seguidos: any[] = [];
  seguidores: any[] = [];
  filteredList: any[] = [];
  searchTerm = '';
  
  cargandoSeguidos = true;
  cargandoSeguidores = true;

  /** Usuarios que YO sigo; manda el botón de cada fila, no la lista que se está viendo. */
  private yoSigo = new Set<string>();
  private miId = '';

  ngOnInit() {
    this.cargarMiRelacion();
    if (this.userId) {
      this.cargarTodo();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && !changes['userId'].firstChange && this.userId) {
      this.cargarTodo();
    }
  }

  cargarTodo() {
    this.cargarSeguidos();
    this.cargarSeguidores();
  }

  private cargarMiRelacion() {
    this.miId = String(this.auth.currentUser()?.id ?? '');
    if (!this.auth.isAuthenticated()) return;

    this.connectionService.getMyFollowing().subscribe({
      next: (lista) => this.yoSigo = new Set(lista.map(c => String(c.contactId))),
      error: () => {}
    });
  }

  cambiarTab(tab: 'seguidos' | 'seguidores') {
    this.activeSubTab = tab;
    this.searchTerm = '';
    this.filtrarListaActual();
  }

  cargarSeguidos() {
    this.cargandoSeguidos = true;
    this.connectionService.getFollowingByUser(this.userId).subscribe({
      next: (data) => {
        this.seguidos = data;
        this.cargandoSeguidos = false;
        if (this.activeSubTab === 'seguidos') this.filtrarListaActual();
      },
      error: () => {
        this.toast.show('Error al cargar seguidos');
        this.cargandoSeguidos = false;
      }
    });
  }

  cargarSeguidores() {
    this.cargandoSeguidores = true;
    this.connectionService.getFollowersByUser(this.userId).subscribe({
      next: (data) => {
        this.seguidores = data;
        this.cargandoSeguidores = false;
        if (this.activeSubTab === 'seguidores') this.filtrarListaActual();
      },
      error: () => {
        this.toast.show('Error al cargar seguidores');
        this.cargandoSeguidores = false;
      }
    });
  }

  filtrarListaActual() {
    const listaBase = this.activeSubTab === 'seguidos' ? this.seguidos : this.seguidores;
    const term = this.searchTerm.trim().toLowerCase();
    
    this.filteredList = !term 
      ? [...listaBase]
      : listaBase.filter(c => {
          const nombre = this.activeSubTab === 'seguidos' ? c.nombreContact : c.nombreUser;
          const username = this.activeSubTab === 'seguidos' ? c.usernameContact : c.usernameUser;
          return (nombre && nombre.toLowerCase().includes(term)) || 
                 (username && username.toLowerCase().includes(term));
        });
  }

  onSearch() {
    this.filtrarListaActual();
  }

  /** La fila siempre representa a la OTRA persona, aunque se vea el perfil de un tercero. */
  private otro(c: any) {
    return this.activeSubTab === 'seguidos'
      ? { id: String(c.contactId), nombre: c.nombreContact, username: c.usernameContact }
      : { id: String(c.userId), nombre: c.nombreUser, username: c.usernameUser };
  }

  esYoMismo(c: any): boolean {
    return !!this.miId && this.otro(c).id === this.miId;
  }

  yaLoSigo(c: any): boolean {
    return this.yoSigo.has(this.otro(c).id);
  }

  irAlPerfil(c: any) {
    const { id, username } = this.otro(c);
    const destino = username || id;
    if (!destino) return;

    // Sin el prefijo /app el clic caía en el perfil público y, si venía vacío, no navegaba.
    const raiz = this.auth.isAuthenticated() ? '/app/perfil' : '/perfil';
    this.router.navigate([raiz, destino]);
  }

  seguir(c: any) {
    const otroPersona = this.otro(c);
    this.connectionService.followUser(otroPersona.id).subscribe({
      next: () => {
        this.yoSigo.add(otroPersona.id);
        this.toast.show(`Ahora sigues a ${otroPersona.nombre}`);
      },
      error: () => this.toast.show('Error al seguir')
    });
  }

  dejarDeSeguir(c: any) {
    const otroPersona = this.otro(c);
    this.connectionService.unfollowUser(otroPersona.id).subscribe({
      next: () => {
        this.yoSigo.delete(otroPersona.id);
        this.toast.show(`Has dejado de seguir a ${otroPersona.nombre}`);
        if (this.esMiPerfil && this.activeSubTab === 'seguidos') {
          this.seguidos = this.seguidos.filter(s => String(s.contactId) !== otroPersona.id);
          this.filtrarListaActual();
        }
      },
      error: () => this.toast.show('Error al dejar de seguir')
    });
  }

  enviarMensaje(contacto: any): void {
    const { id, nombre, username } = this.otro(contacto);

    this.sidePanel.abrirChatCon({ id, name: nombre || 'Usuario', avatar: contacto.avatarUrl, gitUsername: username });
  }
}
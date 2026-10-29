import { Component, OnInit, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConnectionService } from '../../../../core/services/connection.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-tab-contactos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tab-contactos.component.html',
  styleUrls: ['./tab-contactos.component.scss']
})
export class TabContactosComponent implements OnInit, OnChanges {
  @Input() userId!: string; 

  private connectionService = inject(ConnectionService);
  private toast = inject(ToastService);
  private router = inject(Router);

  activeSubTab: 'seguidos' | 'seguidores' = 'seguidos';
  
  seguidos: any[] = [];
  seguidores: any[] = [];
  filteredList: any[] = [];
  searchTerm = '';
  
  cargandoSeguidos = true;
  cargandoSeguidores = true;

  ngOnInit() {
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

  irAlPerfil(username: string) {
    if (username) {
      this.router.navigate(['/perfil', username]); 
    }
  }

  dejarDeSeguir(contacto: any) {
    this.connectionService.unfollowUser(contacto.contactId).subscribe({
      next: () => {
        this.toast.show(`Has dejado de seguir a ${contacto.nombreContact}`);
        this.seguidos = this.seguidos.filter(c => c.contactId !== contacto.contactId);
        this.filtrarListaActual();
      },
      error: () => this.toast.show('Error al dejar de seguir')
    });
  }

  seguirDeVuelta(seguidor: any) {
    this.connectionService.followUser(seguidor.userId).subscribe({
      next: () => {
        this.toast.show(`Ahora sigues a ${seguidor.nombreUser}`);
        this.cargarTodo(); 
        this.cambiarTab('seguidos');
      },
      error: () => this.toast.show('Error al seguir de vuelta')
    });
  }

  enviarMensaje(contacto: any) {
    const nombre = this.activeSubTab === 'seguidos' ? contacto.nombreContact : contacto.nombreUser;
    this.toast.show(`Mensaje a ${nombre} próximamente`);
  }
}
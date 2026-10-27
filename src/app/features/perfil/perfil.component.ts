import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilService } from '../../core/services/perfil.service';
import { TabId } from '../../core/models/perfil.model';
import { PerfilHeaderComponent } from './components/perfil-header/perfil-header.component';
import { PerfilTabsComponent } from './components/perfil-tabs/perfil-tabs.component';
import { TabPublicacionesComponent } from './components/tab-publicaciones/tab-publicaciones.component';
import { TabInformacionComponent } from './components/tab-informacion/tab-informacion.component';
import { TabFotosComponent } from './components/tab-fotos/tab-fotos.component';
import { TabContactosComponent } from './components/tab-contactos/tab-contactos.component';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    PerfilHeaderComponent,
    PerfilTabsComponent,
    TabPublicacionesComponent,
    TabInformacionComponent,
    TabFotosComponent,
    TabContactosComponent,
    ToastComponent
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  private perfilService = inject(PerfilService);

  perfil = this.perfilService.perfil;
  cargando = this.perfilService.cargando;
  seccionActiva: TabId = 'publicaciones';

  ngOnInit(): void {
    this.perfilService.cargarPerfil().subscribe();
    this.perfilService.cargarPublicaciones().subscribe();
  }

  cambiarSeccion(tab: TabId): void {
    this.seccionActiva = tab;
  }
}
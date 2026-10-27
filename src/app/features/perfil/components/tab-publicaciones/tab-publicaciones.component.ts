import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilService } from '../../../../core/services/perfil.service';
import { CrearPostComponent } from '../crear-post/crear-post.component';
import { PostCardComponent } from '../post-card/post-card.component';

@Component({
  selector: 'app-tab-publicaciones',
  standalone: true,
  imports: [CommonModule, CrearPostComponent, PostCardComponent],
  templateUrl: './tab-publicaciones.component.html',
  styleUrls: ['./tab-publicaciones.component.scss']
})
export class TabPublicacionesComponent {
  perfilService = inject(PerfilService);
  publicaciones = this.perfilService.publicaciones;
}
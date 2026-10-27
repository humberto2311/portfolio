import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilService } from '../../core/services/perfil.service';
import { CrearPostComponent } from '../perfil/components/crear-post/crear-post.component';
import { PostCardComponent } from '../perfil/components/post-card/post-card.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, CrearPostComponent, PostCardComponent],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  private perfilService = inject(PerfilService);
  
  // Consumimos las publicaciones del mismo servicio
  publicaciones = this.perfilService.publicaciones;
  cargando = this.perfilService.cargando;

  ngOnInit(): void {
    // Nos aseguramos de cargar los datos si el usuario entra directo aquí
    if (this.publicaciones().length === 0) {
      this.perfilService.cargarPublicaciones().subscribe();
    }
  }
}
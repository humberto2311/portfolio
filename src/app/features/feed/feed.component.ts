import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilService } from '../../core/services/perfil.service';
import { AuthService } from '../../core/services/auth.service'; // 👈 Importamos AuthService
import { CrearPostComponent } from '../perfil/components/crear-post/crear-post.component';
import { PostCardComponent } from '../perfil/components/post-card/post-card.component';
import { ToastComponent } from '../perfil/components/toast/toast.component';
import { EstadosComponent } from '../estados/estados.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    CommonModule,
    CrearPostComponent,
    PostCardComponent,
    ToastComponent,
    EstadosComponent
  ],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  private perfilService = inject(PerfilService);
  private authService = inject(AuthService);
  
  publicaciones = this.perfilService.publicaciones;
  publicacionesVisibles = this.perfilService.publicacionesVisibles;
  readonly cargando = signal(false);

  ngOnInit(): void {
    if (this.publicaciones().length === 0) {
      // 👇 Obtenemos el ID del usuario logueado y se lo pasamos
      const currentUser = this.authService.currentUser();
      if (currentUser?.id) {
        this.cargando.set(true);
        this.perfilService.cargarPublicaciones(currentUser.id);
        setTimeout(() => this.cargando.set(false), 1200);
      }
    }
  }
}
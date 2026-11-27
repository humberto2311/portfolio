import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PerfilService } from '../../core/services/perfil.service';
import { AuthService } from '../../core/services/auth.service';
import { DisenoService } from '../../core/services/diseno.service';
import { TabId } from '../../core/models/perfil.model';

import { PerfilHeaderComponent } from './components/perfil-header/perfil-header.component';
import { PerfilTabsComponent } from './components/perfil-tabs/perfil-tabs.component';
import { TabPublicacionesComponent } from './components/tab-publicaciones/tab-publicaciones.component';
import { TabInformacionComponent } from './components/tab-informacion/tab-informacion.component';
import { TabFotosComponent } from './components/tab-fotos/tab-fotos.component';
import { TabContactosComponent } from './components/tab-contactos/tab-contactos.component';
import { TabEmpresaComponent } from './components/tab-empresa/tab-empresa.component';
import { TabEnlacesComponent } from './components/tab-enlaces/tab-enlaces.component';
import { ToastComponent } from './components/toast/toast.component';
import { NotasUsuarioComponent } from '../../shared/components/notas-usuario/notas-usuario.component';

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
    TabEmpresaComponent,
    TabEnlacesComponent,
    ToastComponent,
    TabContactosComponent,
    NotasUsuarioComponent
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit, OnDestroy {
  private perfilService = inject(PerfilService);
  private authService = inject(AuthService);
  private diseno = inject(DisenoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);


  perfil = this.perfilService.perfil;
  cargando = this.perfilService.cargando;

  seccionActiva: TabId = 'publicaciones';
  esMiPerfil = false;
  disenoAplicado = signal(false);
  mostrarEmpresa = false;

  errorCarga: string | null = null;

  ngOnInit(): void {
    this.marcarDisenoPropio();

    this.route.paramMap.subscribe(params => {
      const usernameUrl = params.get('username');
      const estaLogueado = this.authService.isAuthenticated();

      
      if (usernameUrl) {
        this.errorCarga = null;
        this.perfilService.cargarPerfil(usernameUrl).subscribe({
          next: () => this.evaluarPropietario(),
          error: (err) => this.manejarError(err, usernameUrl)
        });
        return;
      }

     
      if (!estaLogueado) {
        this.router.navigate(['/']); // o a '/login'
        return;
      }

      this.errorCarga = null;
      this.perfilService.cargarPerfil(null).subscribe({
        next: () => this.evaluarPropietario(),
        error: (err) => this.manejarError(err, null)
      });
    });
  }

  private manejarError(err: any, usernameUrl: string | null): void {
    console.error('❌ [PERFIL COMPONENT] Error al cargar perfil:', err);

    if (err?.status === 401) {
      this.errorCarga = 'No autorizado. Inicia sesión para ver este perfil.';
      if (!usernameUrl) {
        this.router.navigate(['/']); 
      }
      return;
    }

    if (err?.status === 404) {
      this.errorCarga = 'El perfil no existe.';
      return;
    }

    this.errorCarga = 'Hubo un problema de conexión con el servidor.';
  }

  private evaluarPropietario(): void {
    const p = this.perfil();
    const currentUser = this.authService.currentUser();

    if (p && currentUser) {
      this.esMiPerfil = currentUser.email === p.contacto.email;
    } else {
      this.esMiPerfil = false;
    }

    this.mostrarEmpresa = this.esMiPerfil;

    this.aplicarDisenoDelPerfil();
  }

  /**
   * Mi propio diseño se escribe con alcance .diseno-visita. La marca se pone
   * al entrar y se quita al salir: si dependiera solo de la comparación de
   * correos, un perfil cargado sin sesión dejaría mi vista sin mi diseño.
   */
  private marcarDisenoPropio(): void {
    const propio = !!this.diseno.propio()?.activo;

    if (propio) {
      this.disenoAplicado.set(true);
    }
  }

  private aplicarDisenoDelPerfil(): void {
    const p = this.perfil();

    if (!p) {
      this.disenoAplicado.set(false);
      this.diseno.limpiarAjeno();
      return;
    }

    if (this.esMiPerfil) {
      // Mi diseño ya está escrito con alcance .diseno-visita: esta vista solo
      // tiene que llevarlo para que las reglas caigan sobre mi perfil.
      this.disenoAplicado.set(true);
      this.diseno.limpiarAjeno();
      return;
    }

    const visita = !!p.disenoActivo;
    this.disenoAplicado.set(visita);

    if (!visita) {
      this.diseno.limpiarAjeno();
      return;
    }

    this.diseno.aplicarAjeno({
      acento: p.disenoAcento ?? null,
      secundario: p.disenoSecundario ?? null,
      fondoUrl: p.disenoFondoUrl ?? null,
      css: p.disenoCss ?? null,
      activo: true,
    });

    // Si el perfil-completo no trajo el fondo (respuesta antigua o dato vacío),
    // se pide el diseño por su endpoint y se pinta igual.
    if (!p.disenoFondoUrl) {
      this.diseno.cargarDeUsuario(p.id).subscribe((diseno) => {
        if (!diseno?.fondoUrl) return;

        this.diseno.aplicarAjeno({
          acento: diseno.acento ?? p.disenoAcento ?? null,
          secundario: diseno.secundario ?? p.disenoSecundario ?? null,
          fondoUrl: diseno.fondoUrl,
          css: diseno.css ?? p.disenoCss ?? null,
          activo: true,
        });
      });
    }
  }

  ngOnDestroy(): void {
    this.disenoAplicado.set(false);
    this.diseno.limpiarAjeno();
  }

  cambiarSeccion(tab: TabId): void {
    this.seccionActiva = tab;
  }

  irAHojaDeVida(): void {
    const p = this.perfil();
    if (!p) return;

    if (this.esMiPerfil) {
      this.router.navigate(['/app/informacion-personal']);
    } else {
      this.router.navigate([`/u/${p.id}`]);
    }
  }

  irAProyectos(): void {
    const p = this.perfil();
    if (!p) return;

    if (this.esMiPerfil) {
      this.router.navigate(['/app/proyectos']);
    } else {
      this.router.navigate([`/proyectos/${p.id}`]);
    }
  }
}
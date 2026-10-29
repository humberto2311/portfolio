import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProyectosService } from '../../core/services/proyectos.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { AuthService } from '../../core/services/auth.service';
import { Proyecto } from '../../core/models/proyecto';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.scss']
})
export class ProyectosComponent implements OnInit {

  private proyectosService = inject(ProyectosService);
  private userProfileService = inject(UserProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public readonly DEFAULT_GIT_USERNAME = 'humberto2311'; 

  public proyectos: Proyecto[] = [];
  public cargando = true;
  public error: string | null = null;
  public busqueda = '';

  public modoPrivado = false;
  public visitandoUsuario: string | null = null; 
  public nombreMostrar: string | null = null; // 👈 NUEVA VARIABLE PARA EL NOMBRE REAL

  public panelAbierto = false;
  public proyectoActivo: Proyecto | null = null;
  public pestanaActiva: 'codigo' | 'git' = 'codigo';
  public ramaSeleccionada = 'main';

  public importando = false;
  public mostrarModalGit = false;
  public gitUsernameInput = '';
  public userProfile: any = null;

  public modoEdicion = false;
  public editForm: Partial<Proyecto> = {};
  public confirmandoEliminarId: number | null = null;
  public buscandoRemoto = false;

  ngOnInit() {
    const enRutaPrivada = this.router.url.startsWith('/app');
    const hayUsuario = !!this.authService.currentUser();
    this.modoPrivado = enRutaPrivada && hayUsuario;
    
    this.route.paramMap.subscribe(params => {
      const urlParam = params.get('username'); 
      
      if (this.modoPrivado) {
        this.visitandoUsuario = null;
        this.nombreMostrar = null; // En privado no necesitamos mostrar el nombre del dueño
        this.cargarProyectosLogueado();
        this.cargarPerfil();
      } else {
        if (enRutaPrivada && !hayUsuario) {
          this.router.navigate(['/proyectos']);
          return;
        }

        if (urlParam) {
          const esUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(urlParam);
          const esNumero = /^\d+$/.test(urlParam);

          if (esUUID || esNumero) {
            this.cargando = true;
            this.userProfileService.getPerfilCompletoPorId(urlParam).subscribe({
              next: (perfil) => {
                if (perfil && perfil.gitUsername) {
                  this.router.navigate(['/proyectos', perfil.gitUsername], { replaceUrl: true });
                } else {
                  this.error = 'Este usuario no tiene un nombre de usuario de GitHub configurado.';
                  this.cargando = false;
                }
              },
              error: (err) => {
                this.error = 'El usuario ingresado no existe.';
                this.cargando = false;
              }
            });
            return;
          }

          // 👇 Si entra por Username, buscamos el perfil para obtener el nombre real
          this.visitandoUsuario = urlParam;
          this.obtenerNombreRealYProyectos(urlParam);
        } else {
          // Si no hay parámetro, mostramos el portafolio por defecto
          this.visitandoUsuario = null;
          this.obtenerNombreRealYProyectos(this.DEFAULT_GIT_USERNAME);
        }
      }
    });
  }

  // 👇 NUEVO MÉTODO: Trae el nombre real y luego los proyectos
  private obtenerNombreRealYProyectos(gitUsername: string) {
    this.cargando = true;
    this.error = null;

    // Primero buscamos el perfil completo para tener el nombre real
    this.userProfileService.getPerfilCompletoPorUsername(gitUsername).subscribe({
      next: (perfil) => {
        this.nombreMostrar = perfil.fullName || gitUsername; // Guardamos el nombre real
        this.cargarProyectosDeUsuario(gitUsername); // Luego cargamos los repos
      },
      error: (err) => {
        // Si falla la búsqueda del nombre (ej. no tiene perfil creado), igual mostramos el username
        this.nombreMostrar = gitUsername; 
        this.cargarProyectosDeUsuario(gitUsername);
      }
    });
  }

  recargarSegunRuta() {
    if (this.modoPrivado) {
      this.cargarProyectosLogueado();
    } else if (this.visitandoUsuario) {
      this.obtenerNombreRealYProyectos(this.visitandoUsuario);
    } else {
      this.obtenerNombreRealYProyectos(this.DEFAULT_GIT_USERNAME);
    }
  }

  cargarProyectosLogueado() {
    this.cargando = true;
    this.error = null;
    
    this.proyectosService.getProyectos().subscribe({
      next: (data) => { 
        this.proyectos = data; 
        this.cargando = false; 
      },
      error: (err) => {
        if (err.status === 401) {
          this.error = 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
        } else {
          this.error = 'Error al cargar tus proyectos.';
        }
        this.cargando = false;
        console.error(err);
      }
    });
  }

  cargarProyectosDeUsuario(username: string) {
    this.cargando = true;
    
    this.proyectosService.getProyectosDeUsuario(username).subscribe({
      next: (data) => { 
        this.proyectos = data.filter(p => p.isPublic); 
        this.cargando = false; 
      },
      error: (err) => {
        this.error = `No se pudieron cargar los proyectos de ${this.nombreMostrar || username}.`;
        this.cargando = false;
        console.error(err);
      }
    });
  }

  private cargarPerfil() {
    this.userProfileService.getMe().subscribe({
      next: (u) => this.userProfile = u,
      error: (err) => console.error('Error cargando perfil', err)
    });
  }

  // ... (El resto de tus métodos se mantienen exactamente igual)
  get proyectosFiltrados(): Proyecto[] {
    if (!this.busqueda.trim()) return this.proyectos;
    const term = this.busqueda.toLowerCase().trim();
    return this.proyectos.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.stack && p.stack.some(s => s.toLowerCase().includes(term))) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }

  get comandoClonar(): string {
    if (!this.proyectoActivo) return '';
    const rama = this.limpiarNombreRama(this.ramaSeleccionada);
    return `git clone -b ${rama} ${this.proyectoActivo.cloneUrl}`;
  }

  get enlaceGithubRama(): string {
    if (!this.proyectoActivo) return '#';
    const urlBase = this.proyectoActivo.cloneUrl
      ? this.proyectoActivo.cloneUrl.replace('.git', '')
      : '#';
    const rama = this.limpiarNombreRama(this.ramaSeleccionada);
    return `${urlBase}/tree/${rama}`;
  }

  limpiarNombreRama(rama: string): string {
    if (!rama) return 'main';
    return rama.replace('refs/heads/', '');
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  abrirPanel(proyecto: Proyecto) {
    if (this.modoEdicion) return;
    this.proyectoActivo = proyecto;
    this.panelAbierto = true;
    this.pestanaActiva = 'codigo';
    this.ramaSeleccionada = proyecto.branches && proyecto.branches.length > 0
      ? proyecto.branches[0] : 'main';
    document.body.style.overflow = 'hidden';
  }

  cerrarPanel() {
    this.panelAbierto = false;
    setTimeout(() => { this.proyectoActivo = null; }, 300);
    document.body.style.overflow = 'auto';
  }

  cambiarPestana(pestana: 'codigo' | 'git') { this.pestanaActiva = pestana; }

  copiarComando() {
    if (this.comandoClonar) {
      navigator.clipboard.writeText(this.comandoClonar).then(() => {
        alert('¡Comando copiado al portapapeles!');
      });
    }
  }

  onCardTilt(event: MouseEvent, proyecto: Proyecto): void {
    const card = document.getElementById('card-' + proyecto.name);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    card.style.transform = `perspective(1000px) rotateX(${(-y / 35)}deg) rotateY(${(x / 35)}deg) scale3d(1.01, 1.01, 1.01)`;
    card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  }

  resetCardTilt(proyecto: Proyecto): void {
    const card = document.getElementById('card-' + proyecto.name);
    if (!card) return;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  }

  abrirImportarGithub() {
    if (!this.modoPrivado) return;

    this.userProfileService.getMe().subscribe({
      next: (u: any) => {
        this.userProfile = u;
        if (u.gitUsername && u.gitUsername.trim()) {
          this.ejecutarImport(u.gitUsername.trim());
        } else {
          this.gitUsernameInput = '';
          this.mostrarModalGit = true;
        }
      },
      error: (err) => {
        console.error(err);
        this.gitUsernameInput = '';
        this.mostrarModalGit = true;
      }
    });
  }

  confirmarGitUsername() {
    const username = this.gitUsernameInput.trim();
    if (!username) return;

    this.userProfileService.updateGitUsername(username).subscribe({
      next: (u: any) => {
        this.userProfile = u;
        this.mostrarModalGit = false;
        this.ejecutarImport(username);
      },
      error: (err) => {
        console.error('Error guardando gitUsername', err);
        this.error = 'No se pudo guardar el usuario de GitHub.';
      }
    });
  }

  private ejecutarImport(username: string) {
    this.importando = true;
    this.proyectos = [];

    this.proyectosService.importAllFromUser(username).subscribe({
      next: () => {
        this.importando = false;
        this.cargarProyectosLogueado();
      },
      error: (err) => {
        this.importando = false;
        this.error = 'Error importando repos: ' + (err?.error?.message || err.message);
        console.error(err);
      }
    });
  }

  cancelarModalGit() {
    this.mostrarModalGit = false;
    this.gitUsernameInput = '';
  }

  toggleVisibilidadCard(proyecto: Proyecto, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const nuevoEstado = !proyecto.isPublic;
    proyecto.isPublic = nuevoEstado;

    this.proyectosService.toggleVisibility(proyecto.id).subscribe({
      next: (updated) => {
        const idx = this.proyectos.findIndex(p => p.id === updated.id);
        if (idx >= 0) this.proyectos[idx] = updated;
      },
      error: (err) => {
        proyecto.isPublic = !nuevoEstado;
        console.error('No se pudo cambiar la visibilidad', err);
      }
    });
  }

  iniciarEdicion(p: Proyecto, event: Event) {
    event.stopPropagation();
    this.modoEdicion = true;
    this.editForm = {
      id: p.id,
      name: p.name,
      description: p.description,
      shortBio: p.shortBio,
      homepage: p.homepage,
      imageUrl: p.imageUrl
    };
  }

  guardarEdicion() {
    if (!this.editForm.id) return;
    this.proyectosService.updateProyecto(this.editForm.id, this.editForm).subscribe({
      next: (updated) => {
        const idx = this.proyectos.findIndex(x => x.id === updated.id);
        if (idx >= 0) this.proyectos[idx] = updated;
        this.modoEdicion = false;
        this.editForm = {};
      },
      error: (err) => console.error('Error actualizando', err)
    });
  }

  cancelarEdicion() {
    this.modoEdicion = false;
    this.editForm = {};
  }

  pedirConfirmarEliminar(id: number, event: Event) {
    event.stopPropagation();
    this.confirmandoEliminarId = id;
  }

  confirmarEliminar(id: number, event: Event) {
    event.stopPropagation();
    this.proyectosService.deleteProyecto(id).subscribe({
      next: () => {
        this.proyectos = this.proyectos.filter(p => p.id !== id);
        this.confirmandoEliminarId = null;
      },
      error: (err) => console.error('Error eliminando', err)
    });
  }

  cancelarEliminar(event: Event) {
    event.stopPropagation();
    this.confirmandoEliminarId = null;
  }

  filtrarProyectos() {
    const term = this.busqueda.trim();

    if (!term) {
      this.recargarSegunRuta();
      return;
    }
    const locales = this.proyectos.filter(p =>
      p.name.toLowerCase().includes(term.toLowerCase()) ||
      (p.stack && p.stack.some(s => s.toLowerCase().includes(term.toLowerCase()))) ||
      (p.description && p.description.toLowerCase().includes(term.toLowerCase()))
    );
    if (locales.length > 0) return; 
    
    this.buscandoRemoto = true;
    const githubTerm = term.replace(/\s+/g, '').toLowerCase();

    this.proyectosService.buscarReposPublicosDeUsuario(githubTerm).subscribe({
      next: (repos) => {
        this.proyectos = repos; 
        this.buscandoRemoto = false;
      },
      error: (err) => {
        console.error('No se encontraron repositorios en GitHub para:', githubTerm);
        this.proyectos = []; 
        this.buscandoRemoto = false;
      }
    });
  }
}
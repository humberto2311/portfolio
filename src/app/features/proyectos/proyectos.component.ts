import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ProyectosService } from '../../core/services/proyectos.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationModalService } from '../../core/services/confirmation-modal.service';
import { AnimatedButtonDirective } from '../../shared/directives/animated-button.directive';
import { ToastService } from '../../core/services/toast.service';
import {
  ComentarioProyecto,
  FuenteProyecto,
  ProveedorOAuth,
  SocialProyecto,
  Proyecto,
  ProjectGroupId,
  ProjectSourceId
} from '../../core/models/proyecto';

type FiltroProyectos = 'todos' | ProjectGroupId;

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, FormsModule, AnimatedButtonDirective],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.scss']
})
export class ProyectosComponent implements OnInit {

  private proyectosService = inject(ProyectosService);
  private userProfileService = inject(UserProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private confirmationModal = inject(ConfirmationModalService);
  private toast = inject(ToastService);

  public readonly DEFAULT_GIT_USERNAME = 'humberto2311'; 

  public proyectos: Proyecto[] = [];
  public cargando = true;
  public error: string | null = null;
  public busqueda = '';

  public modoPrivado = false;
  public visitandoUsuario: string | null = null; 
  public nombreMostrar: string | null = null; 

  public panelAbierto = false;
  public proyectoActivo: Proyecto | null = null;
  public pestanaActiva: 'codigo' | 'git' = 'codigo';
  public ramaSeleccionada = 'main';

  public importando = false;
  public userProfile: any = null;
    public avisoGit: string | null = null;

  public fuentes: FuenteProyecto[] = [];
  public proveedores: ProveedorOAuth[] = [];
  public socialActivo: SocialProyecto | null = null;
  public descripcionHtml = '';
  public descripcionMarkdown = '';
  public editandoDescripcion = false;
  public guardandoDescripcion = false;
  public borradorDescripcion = '';
  public mostrarComentarios = false;
  public cargandoComentarios = false;
  public enviandoComentario = false;
  public comentariosProyecto: ComentarioProyecto[] = [];
  public nuevoComentario = '';
  public fuenteSeleccionada: ProjectSourceId = 'github';
  public urlImportacion = '';
  public importandoFuente = false;
  public errorImportacion: string | null = null;
  public filtroActivo: FiltroProyectos = 'todos';
  public alternandoHubId: number | null = null;
  public registrarVistaEnviada = false;

  public readonly filtros: { id: FiltroProyectos; etiqueta: string }[] = [
    { id: 'todos', etiqueta: 'Todos' },
    { id: 'codigo', etiqueta: 'Código' },
    { id: 'contenedores', etiqueta: 'Contenedores' },
    { id: 'diseno', etiqueta: 'Diseño' },
    { id: 'otros', etiqueta: 'Otros' }
  ];

  public readonly fuentesBase: FuenteProyecto[] = [
    { id: 'github', group: 'codigo', icon: 'fa-brands fa-github' },
    { id: 'gitlab', group: 'codigo', icon: 'fa-brands fa-gitlab' },
    { id: 'docker_hub', group: 'contenedores', icon: 'fa-brands fa-docker' },
    { id: 'behance', group: 'diseno', icon: 'fa-brands fa-behance' },
    { id: 'dribbble', group: 'diseno', icon: 'fa-brands fa-dribbble' },
    { id: 'figma', group: 'diseno', icon: 'fa-brands fa-figma' },
    { id: 'manual', group: 'otros', icon: 'fa-solid fa-link' }
  ];

  public modoEdicion = false;
  public editForm: Partial<Proyecto> = {};
  public confirmandoEliminarId: number | null = null;
  public buscandoRemoto = false;
  private soloPunteroFine: boolean | null = null;

  ngOnInit() {
    const enRutaPrivada = this.router.url.startsWith('/app');
    const hayUsuario = !!this.authService.currentUser();
    this.modoPrivado = enRutaPrivada && hayUsuario;

    this.revisarParametrosGit();

    this.route.paramMap.subscribe(params => {
      const urlParam = params.get('username'); 
      
      if (this.modoPrivado) {
        this.visitandoUsuario = null;
        this.nombreMostrar = null;
        this.cargarProyectosLogueado();
        this.cargarPerfil();
        this.cargarFuentes();
        this.cargarProveedores();
        this.registrarVistaEnHub();
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

          
          this.visitandoUsuario = urlParam;
          this.obtenerNombreRealYProyectos(urlParam);
        } else {
          
          this.visitandoUsuario = null;
          this.obtenerNombreRealYProyectos(this.DEFAULT_GIT_USERNAME);
        }
      }
    });
  }

  
  private obtenerNombreRealYProyectos(gitUsername: string) {
    this.cargando = true;
    this.error = null;

    
    this.userProfileService.getPerfilCompletoPorUsername(gitUsername).subscribe({
      next: (perfil) => {
        this.nombreMostrar = perfil.fullName || gitUsername; 
        this.cargarProyectosDeUsuario(gitUsername); 
      },
      error: (err) => {
        
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
        this.proyectos = this.ordenarPorFecha(data); 
        this.cargando = false; 
        this.cargarSocialDeTarjetas();
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
        this.proyectos = this.ordenarPorFecha(data.filter(p => p.isPublic)); 
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

  
  
  

  public readonly IMAGEN_DEFECTO =
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop';

    private ordenarPorFecha(lista: Proyecto[]): Proyecto[] {
    return [...(lista ?? [])].sort((a, b) => {
      const fa = a.lastCommitDate ? new Date(a.lastCommitDate).getTime() : 0;
      const fb = b.lastCommitDate ? new Date(b.lastCommitDate).getTime() : 0;
      return fb - fa;
    });
  }

    imagenProyecto(p: Proyecto): string {
    if (p.imageUrl) return p.imageUrl;
    if (p.homepage) {
      return `https://image.thum.io/get/width/900/crop/600/${p.homepage}`;
    }
    return this.IMAGEN_DEFECTO;
  }

  onImagenError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== this.IMAGEN_DEFECTO) {
      img.src = this.IMAGEN_DEFECTO;
    }
  }

  stackVisible(p: Proyecto): string[] {
    return (p.stack ?? []).slice(0, 3);
  }

    resumenProyecto(p: Proyecto): string {
    const texto = this.textoPlano(p.shortBio || p.description || '');
    const generica = /^sin descripci[oó]n( disponible| detallada)?\.?$/i.test(texto);
    if (!texto || generica) {
      return p.homepage ? 'Proyecto desplegado en ' + this.dominioHomepage(p) : 'Sin descripción todavía.';
    }
    return texto.length > 130 ? texto.slice(0, 130).trim() + '…' : texto;
  }

    markdownAHtml(markdown: string): string {
    return (markdown ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^\s{0,3}######\s+(.*)$/gm, '<h6>$1</h6>')
      .replace(/^\s{0,3}#####\s+(.*)$/gm, '<h5>$1</h5>')
      .replace(/^\s{0,3}####\s+(.*)$/gm, '<h4>$1</h4>')
      .replace(/^\s{0,3}###\s+(.*)$/gm, '<h3>$1</h3>')
      .replace(/^\s{0,3}##\s+(.*)$/gm, '<h2>$1</h2>')
      .replace(/^\s{0,3}#\s+(.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^/, '<p>').replace(/$/, '</p>');
  }

    private textoPlano(markdown: string): string {
    return (markdown ?? '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^\s{0,3}#{1,6}\s*/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/[*_`>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Texto corto con el dominio de la homepage, para mostrarlo en la card. */
  dominioHomepage(p: Proyecto): string {
    if (!p.homepage) return '';
    try {
      const url = new URL(p.homepage);
      return url.host.replace(/^www\./, '');
    } catch {
      return p.homepage;
    }
  }

  abrirHomepage(p: Proyecto, event: Event) {
    event.stopPropagation();
    if (p.homepage) window.open(p.homepage, '_blank', 'noopener');
  }

  // ... (El resto de tus métodos se mantienen exactamente igual)
  get proyectosFiltrados(): Proyecto[] {
    const term = this.busqueda.toLowerCase().trim();
    const porGrupo = this.proyectos.filter(p => this.cumpleFiltro(p));

    if (!term) return porGrupo;

    return porGrupo.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.stack && p.stack.some(s => s.toLowerCase().includes(term))) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }

  private cumpleFiltro(p: Proyecto): boolean {
    if (this.filtroActivo === 'todos') return true;
    return this.grupoDe(p) === this.filtroActivo;
  }

  grupoDe(p: Proyecto): ProjectGroupId {
    if (p.sourceGroup) return p.sourceGroup;
    return this.fuentesBase.find(f => f.id === this.fuenteDe(p))?.group ?? 'otros';
  }

  fuenteDe(p: Proyecto): ProjectSourceId {
    return p.sourceType ?? 'github';
  }

  iconoFuente(p: Proyecto): string {
    return this.fuentesBase.find(f => f.id === this.fuenteDe(p))?.icon ?? 'fa-solid fa-rocket';
  }

  nombreFuente(p: Proyecto): string {
    return this.etiquetaFuente(this.fuenteDe(p));
  }

  /** Enlace público del proyecto en su fuente original. */
  enlaceFuente(p: Proyecto): string {
    if (p.sourceUrl) return p.sourceUrl;
    if (p.homepage) return p.homepage;
    return p.cloneUrl ? p.cloneUrl.replace(/\.git$/, '') : '';
  }

  contarPorFiltro(filtro: FiltroProyectos): number {
    if (filtro === 'todos') return this.proyectos.length;
    return this.proyectos.filter(p => this.grupoDe(p) === filtro).length;
  }

  cambiarFiltro(filtro: FiltroProyectos) {
    this.filtroActivo = filtro;
  }

  // ==========================================
  // IMPORTACIÓN MULTI-FUENTE
  // ==========================================

  private cargarProveedores() {
    this.proyectosService.getProveedoresOAuth().subscribe({
      next: (lista) => { this.proveedores = lista ?? []; },
      error: () => { this.proveedores = []; }
    });
  }

  private cargarFuentes() {
    this.proyectosService.getFuentes().subscribe({
      next: (fuentes) => { if (fuentes?.length) this.fuentes = fuentes; },
      error: () => { this.fuentes = this.fuentesBase; }
    });
  }

  get fuentesDisponibles(): FuenteProyecto[] {
    return this.fuentes.length ? this.fuentes : this.fuentesBase;
  }

  get iconoFuenteSeleccionada(): string {
    return this.fuentesBase.find(f => f.id === this.fuenteSeleccionada)?.icon ?? 'fas fa-link';
  }

  get placeholderUrl(): string {
    return this.proyectosService.placeholderDe(this.fuenteSeleccionada);
  }

  get puedeImportar(): boolean {
    return this.modoPrivado && !this.importandoFuente && this.urlImportacion.trim().length > 8;
  }

  onUrlImportacion() {
    const sugerida = this.proyectosService.fuenteSugerida(this.urlImportacion);
    if (sugerida) this.fuenteSeleccionada = sugerida;
    this.errorImportacion = null;
  }

  cambiarFuente(fuente: ProjectSourceId) {
    this.fuenteSeleccionada = fuente;
    this.errorImportacion = null;
  }

  importarProyecto() {
    if (!this.modoPrivado || this.importandoFuente) return;

    const url = this.urlImportacion.trim();
    if (!url) {
      this.errorImportacion = 'Pega la URL del proyecto que quieres importar.';
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      this.errorImportacion = 'La URL debe empezar por http:// o https://';
      return;
    }

    this.importandoFuente = true;
    this.errorImportacion = null;

    this.proyectosService.importarProyecto({
      sourceType: this.fuenteSeleccionada,
      sourceUrl: url
    }).subscribe({
      next: (proyecto) => {
        this.importandoFuente = false;
        this.urlImportacion = '';
        const idx = this.proyectos.findIndex(p => p.id === proyecto.id);
        if (idx >= 0) this.proyectos[idx] = proyecto;
        else this.proyectos = this.ordenarPorFecha([proyecto, ...this.proyectos]);
        this.toast.show('Proyecto importado correctamente.');
      },
      error: (err) => {
        this.importandoFuente = false;
        this.errorImportacion = err?.error?.error || err?.error?.message
          || 'No se pudo importar el proyecto. Revisa la URL e inténtalo de nuevo.';
      }
    });
  }

  // ==========================================
  // HUB DE ENLACES
  // ==========================================

  private registrarVistaEnHub() {
    if (this.registrarVistaEnviada) return;
    this.registrarVistaEnviada = true;

    this.proyectosService.registrarVistaEnHub().subscribe({
      error: () => { this.registrarVistaEnviada = false; }
    });
  }

  toggleHub(proyecto: Proyecto, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.modoPrivado || this.alternandoHubId === proyecto.id) return;

    const nuevoEstado = !proyecto.hubVisible;
    proyecto.hubVisible = nuevoEstado;
    this.alternandoHubId = proyecto.id;

    this.proyectosService.mostrarEnHub(proyecto.id, nuevoEstado).subscribe({
      next: (actualizado) => {
        const idx = this.proyectos.findIndex(p => p.id === actualizado.id);
        if (idx >= 0) this.proyectos[idx] = actualizado;
        this.alternandoHubId = null;
        this.toast.show(nuevoEstado
          ? 'El proyecto ya aparece en tu Hub de Enlaces.'
          : 'El proyecto se quitó del Hub de Enlaces.');
      },
      error: (err) => {
        proyecto.hubVisible = !nuevoEstado;
        this.alternandoHubId = null;
        this.toast.show(err?.error?.error || 'No se pudo actualizar el Hub de Enlaces.');
      }
    });
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
    this.resetCardTilt(proyecto);
    this.proyectoActivo = proyecto;
    this.panelAbierto = true;
    this.pestanaActiva = 'codigo';
    this.ramaSeleccionada = proyecto.branches && proyecto.branches.length > 0
      ? proyecto.branches[0] : 'main';
    document.body.style.overflow = 'hidden';
    this.cargarSocial(proyecto.id);
  }

  /** Likes, comentarios y vistas de cada tarjeta visible, en una sola tanda. */
  cargarSocialDeTarjetas() {
    for (const p of this.proyectosFiltrados.slice(0, 24)) {
      this.proyectosService.getSocialProyecto(p.id).subscribe({
        next: (s) => {
          p.likes = s.likes;
          p.comments = s.comments;
          p.views = s.views;
          p.likedByMe = s.likedByMe;
        },
        error: () => {}
      });
    }
  }

  cargarSocial(id: number) {
    this.socialActivo = null;
    this.mostrarComentarios = false;
    this.comentariosProyecto = [];
    this.nuevoComentario = '';

    this.descripcionHtml = '';
    this.descripcionMarkdown = '';
    this.editandoDescripcion = false;

    this.proyectosService.getDescripcionProyecto(id).subscribe({
      next: (d) => {
        this.descripcionMarkdown = d.markdown ?? '';
        this.descripcionHtml = d.html || this.markdownAHtml(d.markdown);
      },
      error: () => { this.descripcionHtml = ''; }
    });

    this.proyectosService.getSocialProyecto(id).subscribe({
      next: (social) => { this.socialActivo = social; },
      error: () => { this.socialActivo = null; }
    });

    this.proyectosService.registrarVistaProyecto(id).subscribe({
      next: (r) => { if (this.socialActivo) this.socialActivo.views = r.views; },
      error: () => {}
    });
  }

  empezarEdicionDescripcion() {
    if (!this.modoPrivado) return;
    this.borradorDescripcion = this.descripcionMarkdown || '';
    this.editandoDescripcion = true;
  }

  cancelarEdicionDescripcion() {
    this.editandoDescripcion = false;
    this.borradorDescripcion = '';
  }

  guardarDescripcion() {
    if (!this.proyectoActivo || this.guardandoDescripcion) return;

    this.guardandoDescripcion = true;
    this.proyectosService.guardarDescripcionProyecto(this.proyectoActivo.id, this.borradorDescripcion)
      .subscribe({
        next: (actualizado) => {
          this.guardandoDescripcion = false;
          this.editandoDescripcion = false;
          this.proyectoActivo = { ...this.proyectoActivo!, description: actualizado.description };
          const idx = this.proyectos.findIndex(x => x.id === actualizado.id);
          if (idx >= 0) this.proyectos[idx] = { ...this.proyectos[idx], description: actualizado.description };
          this.descripcionMarkdown = actualizado.description ?? '';
          this.proyectosService.getDescripcionProyecto(actualizado.id).subscribe({
            next: (d) => { this.descripcionHtml = d.html || this.markdownAHtml(d.markdown); },
            error: () => {}
          });
        },
        error: () => { this.guardandoDescripcion = false; }
      });
  }

  /** Me gusta desde la tarjeta, sin abrir el panel. */
  alternarMeGustaTarjeta(p: Proyecto, event: Event) {
    event.stopPropagation();
    if (!this.modoPrivado) return;

    this.proyectosService.alternarMeGustaProyecto(p.id).subscribe({
      next: (r) => {
        p.likes = r.likes;
        p.likedByMe = r.liked;
        if (this.proyectoActivo?.id === p.id && this.socialActivo) {
          this.socialActivo.likes = r.likes;
          this.socialActivo.likedByMe = r.liked;
        }
      },
      error: () => {}
    });
  }

  alternarMeGustaProyecto() {
    if (!this.socialActivo || !this.proyectoActivo || !this.modoPrivado) return;
    const id = this.proyectoActivo.id;

    this.proyectosService.alternarMeGustaProyecto(id).subscribe({
      next: (r) => {
        if (!this.socialActivo) return;
        this.socialActivo.likes = r.likes;
        this.socialActivo.likedByMe = r.liked;
      },
      error: () => {}
    });
  }

  verComentariosProyecto() {
    if (!this.proyectoActivo) return;
    this.mostrarComentarios = !this.mostrarComentarios;
    if (this.mostrarComentarios) this.cargarComentariosProyecto(this.proyectoActivo.id);
  }

  cargarComentariosProyecto(id: number) {
    this.cargandoComentarios = true;
    this.proyectosService.getComentariosProyecto(id).subscribe({
      next: (r) => {
        this.comentariosProyecto = r.content ?? [];
        this.cargandoComentarios = false;
      },
      error: () => {
        this.comentariosProyecto = [];
        this.cargandoComentarios = false;
      }
    });
  }

  enviarComentarioProyecto() {
    if (!this.proyectoActivo || this.enviandoComentario) return;
    const texto = this.nuevoComentario.trim();
    if (!texto) return;

    this.enviandoComentario = true;
    this.proyectosService.comentarProyecto(this.proyectoActivo.id, texto).subscribe({
      next: (comentario) => {
        this.comentariosProyecto = [...this.comentariosProyecto, comentario];
        this.nuevoComentario = '';
        this.enviandoComentario = false;
        if (this.socialActivo) this.socialActivo.comments += 1;
      },
      error: () => { this.enviandoComentario = false; }
    });
  }

  borrarComentarioProyecto(commentId: string) {
    if (!this.proyectoActivo) return;

    this.proyectosService.borrarComentarioProyecto(this.proyectoActivo.id, commentId).subscribe({
      next: () => {
        this.comentariosProyecto = this.comentariosProyecto.filter(c => c.id !== commentId);
        if (this.socialActivo) this.socialActivo.comments = Math.max(0, this.socialActivo.comments - 1);
      },
      error: () => {}
    });
  }

  get miUsuarioId(): string | null {
    return this.authService.currentUser()?.id ?? null;
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

  trackPorId(_indice: number, proyecto: Proyecto): number {
    return proyecto.id;
  }

  onCardTilt(event: MouseEvent, proyecto: Proyecto): void {
    if (this.soloPunteroFine === null) {
      this.soloPunteroFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }
    if (!this.soloPunteroFine) return;

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

  /** Lee ?importar=1 / ?gitError=1 que devuelve el callback de GitHub. */
  private revisarParametrosGit() {
    this.route.queryParamMap.subscribe((qp) => {
      if (qp.get('gitError')) {
        this.avisoGit =
          'Ese usuario de GitHub ya está registrado en el sistema con otra cuenta.';
      }

      if (qp.get('gitlab') === 'ok') {
        // El back ya importó los proyectos al volver de GitLab (el token se usa una vez y se
        // descarta), así que aquí solo se recarga la lista.
        this.fuenteSeleccionada = 'gitlab';
        this.errorImportacion = null;
        this.cargarFuentes();
        this.cargarProyectosLogueado();
        const importados = Number(qp.get('importados') ?? 0);
        this.toast.show(importados > 0
          ? `Se importaron ${importados} proyectos de GitLab.`
          : 'GitLab conectado, pero no se encontraron proyectos para importar.');
      } else if (qp.get('gitlab')) {
        this.errorImportacion =
          'No se pudo conectar GitLab. Vuelve a intentarlo desde "Conectar GitLab".';
      }

      if (qp.get('importar') === '1' && this.modoPrivado) {
        this.importarConGitGuardado();
      }
    });
  }

  /** Importa todos los proyectos públicos del usuario en la fuente elegida. */
  importarTodoDeLaFuente() {
    if (!this.modoPrivado || this.importandoFuente) return;

    if (!this.permiteImportarTodo) {
      this.errorImportacion =
        'En ' + this.etiquetaFuente(this.fuenteSeleccionada) +
        ' hay que pegar el enlace del proyecto que quieras importar.';
      return;
    }

    this.errorImportacion = null;
    this.avisoGit = null;

    if (this.fuenteSeleccionada === 'github') {
      this.abrirImportarGithub();
      return;
    }

    if (this.fuenteDeImportacion?.conectado) {
      this.ejecutarImportarConectado();
      return;
    }

    const guardado = this.usuarioDeLaFuente();
    if (guardado) {
      this.ejecutarImportarTodo(guardado);
      return;
    }

    this.conectarFuente();
  }

  /** Si la fuente necesita iniciar sesión con esa cuenta, se avisa en vez de importar. */
  get requiereIniciarSesion(): boolean {
    return !this.fuenteDeImportacion?.conectado;
  }

  get mensajeIniciarSesion(): string {
    return 'Para importar tus proyectos de ' + this.etiquetaFuente(this.fuenteSeleccionada) +
      ' inicia sesión con tu cuenta de ' + this.etiquetaFuente(this.fuenteSeleccionada) +
      '. Ese acceso solo se usa para leer tus proyectos.';
  }

  /** Lleva al login de la fuente para vincular la cuenta a este perfil. */
  conectarFuente() {
    const proveedor = this.proveedores.find(p => p.id === this.fuenteSeleccionada);
    if (!proveedor) {
      this.errorImportacion =
        'La conexión con ' + this.etiquetaFuente(this.fuenteSeleccionada) +
        ' no está configurada en el servidor (faltan sus credenciales).';
      return;
    }

    this.importandoFuente = true;

    // GitLab solo vincula la cuenta (no inicia sesión): el back necesita saber de quién es, y la
    // navegación a GitLab no lleva el token. Primero se pide un ticket de un solo uso con la sesión.
    if (proveedor.id === 'gitlab') {
      this.proyectosService.iniciarVinculoGitLab().subscribe({
        next: ({ url }) => { window.location.href = url; },
        error: () => {
          this.importandoFuente = false;
          this.errorImportacion = 'No se pudo iniciar la conexión con GitLab. Inténtalo de nuevo.';
        }
      });
      return;
    }

    window.location.href = proveedor.url;
  }

  /** Importa usando el token ya vinculado (GitLab). */
  ejecutarImportarConectado() {
    this.importandoFuente = true;
    this.errorImportacion = null;

    this.proyectosService.importarConCuentaConectada(this.fuenteSeleccionada).subscribe({
      next: () => {
        this.importandoFuente = false;
        this.cargarProyectosLogueado();
        this.cargarFuentes();
      },
      error: (err) => {
        this.importandoFuente = false;
        const mensaje = err?.error?.message || err?.error?.error || err.message;
        this.errorImportacion = 'No se pudieron importar los proyectos: ' + mensaje;
      },
    });
  }

  /** Ejecuta la importación masiva con el usuario indicado. */
  ejecutarImportarTodo(usuario: string) {
    const nombre = (usuario ?? '').trim().replace(/^@/, '');
    if (!nombre) {
      this.conectarFuente();
      return;
    }

    this.importandoFuente = true;
    this.errorImportacion = null;

    this.proyectosService.importarTodoDeFuente(this.fuenteSeleccionada, nombre).subscribe({
      next: () => {
        this.importandoFuente = false;
        this.cargarProyectosLogueado();
      },
      error: (err) => {
        this.importandoFuente = false;
        const mensaje = err?.error?.message || err?.error?.error || err.message;
        this.errorImportacion = 'No se pudieron importar los proyectos: ' + mensaje;
      },
    });
  }

  private usuarioDeLaFuente(): string | null {
    const perfil: any = this.userProfile;
    if (!perfil) return null;

    if (this.fuenteSeleccionada === 'gitlab') return perfil.gitlabUsername?.trim() || null;
    return null;
  }

  get permiteImportarTodo(): boolean {
    return !!this.fuenteDeImportacion?.porUsuario;
  }

  get iconoImportarTodo(): string {
    return this.fuenteDeImportacion?.icon ?? 'fa-solid fa-download';
  }

  get etiquetaImportarTodo(): string {
    const nombre = this.etiquetaFuente(this.fuenteSeleccionada);
    if (this.fuenteDeImportacion?.conectado) return 'Importar todos mis proyectos de ' + nombre;
    return 'Inicia sesión con ' + nombre + ' para importar';
  }

  private get fuenteDeImportacion(): FuenteProyecto | undefined {
    return (this.fuentes.length ? this.fuentes : this.fuentesBase)
      .find(f => f.id === this.fuenteSeleccionada);
  }

  /** Icono de la fuente (marca), para el desplegable y los botones. */
  iconoDeFuente(fuente: ProjectSourceId): string {
    const iconos: Record<ProjectSourceId, string> = {
      github: 'fa-brands fa-github',
      gitlab: 'fa-brands fa-gitlab',
      docker_hub: 'fa-brands fa-docker',
      behance: 'fa-brands fa-behance',
      dribbble: 'fa-brands fa-dribbble',
      figma: 'fa-brands fa-figma',
      manual: 'fa-solid fa-link'
    };
    return iconos[fuente] ?? 'fa-solid fa-link';
  }

  etiquetaFuente(fuente: ProjectSourceId): string {
    const nombres: Record<ProjectSourceId, string> = {
      github: 'GitHub',
      gitlab: 'GitLab',
      docker_hub: 'Docker Hub',
      behance: 'Behance',
      dribbble: 'Dribbble',
      figma: 'Figma',
      manual: 'Enlace manual'
    };
    return nombres[fuente] ?? fuente;
  }

  abrirImportarGithub() {
    if (!this.modoPrivado) return;
    this.avisoGit = null;

    this.userProfileService.getMe().subscribe({
      next: (u: any) => {
        this.userProfile = u;
        if (u.gitUsername && u.gitUsername.trim()) {
          // Ya tiene gitUsername en userprofile: se importa normal.
          this.ejecutarImport(u.gitUsername.trim());
        } else {
          this.irALoginGit();
        }
      },
      error: () => this.irALoginGit(),
    });
  }

  /** No tiene git guardado: se autentica con GitHub y se vuelve a importar. */
  private irALoginGit() {
    sessionStorage.setItem('nfc_return_to', '/app/proyectos?importar=1');
    this.authService.loginWithProvider('github');
  }

  private importarConGitGuardado() {
    this.userProfileService.getMe().subscribe({
      next: (u: any) => {
        this.userProfile = u;
        const git = u?.gitUsername?.trim();
        if (git) {
          this.ejecutarImport(git);
        } else {
          this.error =
            'No se pudo obtener tu usuario de GitHub. Intenta de nuevo con "Importar desde GitHub".';
        }
      },
      error: (err) => {
        this.error = 'No se pudo leer tu perfil: ' + (err?.error?.message || err.message);
      },
    });
  }

  private ejecutarImport(username: string) {
    this.importando = true;
    this.avisoGit = null;

    this.proyectosService.importAllFromUser(username).subscribe({
      next: (cards) => {
        this.importando = false;
        this.cargarProyectosLogueado();
        // Limpia ?importar=1 de la URL
        this.router.navigate(['/app/proyectos'], { replaceUrl: true });
      },
      error: (err) => {
        this.importando = false;
        const mensaje = err?.error?.message || err?.error?.error || err.message;
        if (String(mensaje).toLowerCase().includes('ya está registrado')) {
          this.avisoGit = mensaje;
        } else {
          this.error = 'Error importando repos: ' + mensaje;
        }
        console.error(err);
      },
    });
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

  async pedirConfirmarEliminar(proyecto: Proyecto, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.confirmationModal.confirmDelete(proyecto.name);
    if (confirmed) {
      this.proyectosService.deleteProyecto(proyecto.id).subscribe({
        next: () => {
          this.proyectos = this.proyectos.filter(p => p.id !== proyecto.id);
        },
        error: (err) => console.error('Error eliminando', err)
      });
    }
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

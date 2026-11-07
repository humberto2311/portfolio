import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { switchMap, finalize, catchError } from 'rxjs/operators';
import { forkJoin, of, firstValueFrom } from 'rxjs';
import { ResumeService } from '../../core/services/resume.service';
import { ResumeSaveService } from '../../core/services/resume-save.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { ToastService } from '../../core/services/toast.service';
import { ArchivoService } from '../../core/services/archivo.service';
import { FotoPerfil, UserPhotoService } from '../../core/services/user-photo.service';
import { imagenDePerfilComoDataUrl } from '../../core/utils/imagen.util';
import { ResumeProfile, ResumeSection } from '../../core/models/resume.model';

/** Una fila clave/valor del JSON que guarda cada item. */
interface ParContenido {
  clave: string;
  valor: string;
}

interface ItemEditable {
  id?: number;
  /** Contenido tal como vino de la BD: conserva los valores no editables (arreglos, objetos). */
  original: Record<string, any>;
  pares: ParContenido[];
  source: string;
  nuevo: boolean;
  abierto: boolean;
}

interface SeccionEditable {
  id?: number;
  sectionKey: string;
  title: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  items: ItemEditable[];
  nueva: boolean;
}

@Component({
  selector: 'app-informacion-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './informacion-personal.component.html',
  styleUrls: ['./informacion-personal.component.scss']
})
export class InformacionPersonalComponent implements OnInit {
  private resumeService = inject(ResumeService);
  private resumeSave = inject(ResumeSaveService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private archivos = inject(ArchivoService);
  private fotosSvc = inject(UserPhotoService);
  private userProfile = inject(UserProfileService);
  public router = inject(Router);

  public loading = true;
  public errorMessage: string | null = null; 

  public nombre = '';
  public rol = '';
  public perfilProfesional = '';
  public resumePdfUrl = 'assets/docs/HOJADEVIDA-HUMBERTOLOZANOVERBEL.pdf';
  public contacto: any[] = [];
  public experiencia: any[] = [];
  public formacion: any[] = [];
  public tecnologias: any[] = [];
  public metricas: any[] = [];
  public welcomeDesc = '';
  public iniciales = '';
  public photoUrl: string | null = null;

  // Estado de publicación
  public profileId: number | null = null;
  public esPublico = false;
  public esPropietario = false;
  public cambiandoVisibilidad = false;
  public generandoPdf = false;
  public sinHojaDeVida = false;
  public creandoHojaDeVida = false;

  private readonly DEFAULT_FULL_NAME = 'Humberto Jose Lozano Verbel';

  // ====== EDICIÓN MANUAL DEL CV ======
  public editando = false;
  public guardando = false;

  public form = {
    headline: '',
    summary: '',
    shortBio: '',
    email: '',
    phone: '',
    location: '',
    githubUrl: '',
    linkedinUrl: '',
    avatarUrl: '',
    resumePdfUrl: '',
  };

  private avatarAlEditar = '';

  /** Copia editable de las secciones; se reconstruye al entrar en modo edición. */
  public seccionesEditables: SeccionEditable[] = [];

  // ====== FOTO DEL CV ======

  fotosGaleria: FotoPerfil[] = [];
  mostrandoGaleria = false;
  cargandoGaleria = false;

  /** Abre el selector: galería del perfil (user_photos) + la foto de perfil. */
  abrirGaleriaFoto(): void {
    if (this.mostrandoGaleria) {
      this.mostrandoGaleria = false;
      return;
    }

    this.mostrandoGaleria = true;
    const miId = String(this.authService.currentUser()?.id ?? '');
    if (!miId || this.cargandoGaleria) return;

    this.cargandoGaleria = true;
    this.fotosSvc.listar(miId).subscribe({
      next: (lista) => {
        this.fotosGaleria = lista ?? [];
        this.cargandoGaleria = false;
      },
      error: () => {
        this.fotosGaleria = [];
        this.cargandoGaleria = false;
      }
    });
  }

  elegirFoto(url: string): void {
    this.form.avatarUrl = url;
    this.mostrandoGaleria = false;
  }

  get fotoVisible(): string | null {
    if (!this.editando) return this.photoUrl;
    return (this.form.avatarUrl ?? '').trim() || null;
  }

  /** Sube una imagen nueva desde el dispositivo y la deja en el formulario. */
  elegirArchivoFoto(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = () => {
      const archivo = input.files?.[0];
      if (!archivo) return;

      imagenDePerfilComoDataUrl(archivo, 'avatar').then(
        (dataUrl) => this.elegirFoto(dataUrl),
        () => this.toast.show('No se pudo procesar la imagen')
      );
    };
    input.click();
  }

  /** Las que ya tienen su propio bloque visual no se repiten abajo. */
  private readonly CLAVES_CONOCIDAS = ['experience', 'education', 'skill', 'metric'];

  private readonly CLAVES_CABECERA = [
    'titulo', 'title', 'nombre', 'name', 'empresa', 'company', 'cargo', 'role',
    'institucion', 'institución', 'school', 'habilidad', 'skill', 'valor', 'texto',
  ];

  private readonly CLAVES_DETALLE = [
    'detalle', 'descripcion', 'descripción', 'description', 'resumen', 'notas',
    'contenido', 'logros', 'text',
  ];

  private readonly CLAVES_META = [
    'fecha', 'periodo', 'year', 'año', 'anio', 'duracion', 'duración',
    'ubicacion', 'ubicación', 'location', 'nivel', 'level', 'tendencia',
  ];

  /** Nombre amable de cada clave para que el editor no hable en claves de la BD. */
  private readonly ETIQUETAS: Record<string, string> = {
    nombre: 'Nombre', titulo: 'Título', title: 'Título', name: 'Nombre', texto: 'Texto',
    icono: 'Ícono', icon: 'Ícono', logo: 'Logo',
    empresa: 'Empresa', company: 'Empresa', cargo: 'Cargo', role: 'Puesto', puesto: 'Puesto',
    fecha: 'Fechas', periodo: 'Periodo', year: 'Año', anio: 'Año', año: 'Año',
    inicio: 'Inicio', fin: 'Fin',
    descripcion: 'Descripción', detalle: 'Detalle', description: 'Descripción', resumen: 'Resumen',
    institucion: 'Institución', school: 'Institución', grado: 'Grado', degree: 'Grado',
    nivel: 'Nivel', level: 'Nivel', valor: 'Valor', tendencia: 'Tendencia', color: 'Color',
    ubicacion: 'Ubicación', location: 'Ubicación', url: 'Enlace', enlace: 'Enlace',
    skill: 'Habilidad', habilidad: 'Habilidad',
  };

  /** Claves que guardan una clase de ícono en lugar de texto visible. */
  private readonly CLAVES_ICONO = ['icono', 'icon', 'logo', 'avatar'];

  /** Campos con los que nace un ítem nuevo, según el tipo de sección. */
  private readonly PLANTILLAS: Record<string, string[][]> = {
    experience: [['empresa', ''], ['cargo', ''], ['fecha', ''], ['descripcion', '']],
    education: [['institucion', ''], ['titulo', ''], ['year', '']],
    skill: [['nombre', ''], ['icono', '']],
    metric: [['titulo', ''], ['valor', ''], ['tendencia', ''], ['icono', ''], ['color', '']],
  };

  private readonly PLANTILLA_LIBRE = [['titulo', ''], ['detalle', ''], ['fecha', '']];

  /** Las cuatro secciones que el CV ya tiene diseñadas, para crearlas sin importar un PDF. */
  public readonly SECCIONES_BASE = [
    { sectionKey: 'experience', title: 'Experiencia', icon: '💼' },
    { sectionKey: 'education', title: 'Formación Académica', icon: '🎓' },
    { sectionKey: 'skill', title: 'Stack Tecnológico', icon: '🛠️' },
    { sectionKey: 'metric', title: 'Métricas', icon: '📊' },
  ];

  private perfilCv: ResumeProfile | null = null;
  private seccionesRaw: ResumeSection[] = [];

  ngOnInit() {
    this.resolverPerfil();
  }

  private resolverPerfil() {
    this.loading = true;
    this.errorMessage = null;
    this.sinHojaDeVida = false;

    const urlParam = this.route.snapshot.paramMap.get('username') || this.route.snapshot.paramMap.get('id');
    const isEditRoute = this.router.url.includes('/app/informacion-personal');

    // 1) Si hay URL param
    if (urlParam) {
      this.esPropietario = false;
      
      // 👇 Detectar si es UUID o ID numérico
      const esUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(urlParam);
      const esIDNumerico = /^\d+$/.test(urlParam);

      // El ID numérico interno sigue bloqueado (no expone el perfil completo).
      if (esIDNumerico && !isEditRoute) {
        this.setError('Por motivos de seguridad, no se permite buscar currículums por ID interno. Usa el enlace con el nombre de usuario.');
        return;
      }

      if (esUUID) {
        // El backend decide: CV público para cualquiera, privado solo su dueño.
        this.loadByUserId(urlParam);
      } else if (esIDNumerico) {
        this.loadById(Number(urlParam));
      } else {
        // Es un slug o nombre de usuario (la forma pública y segura)
        this.loadBySlug(urlParam);
      }
      return;
    }

    // 2) Si es modo edición, o no hay URL param (cargar el mío)
    const currentUser = this.authService.currentUser();
    
    if (currentUser && currentUser.id) {
      this.esPropietario = true;
      this.loadByUserId(currentUser.id);
    } else {
      if (isEditRoute) {
        this.loading = false;
        this.router.navigate(['/']); 
      } else {
        this.esPropietario = false;
        this.loadByFullName(this.DEFAULT_FULL_NAME);
      }
    }
  }

  private loadByUserId(userId: string) {
    this.resumeService.getProfileByUserId(userId).pipe(
      switchMap(profile => {
        if (!profile || !profile.id) return of({ profile: null, sections: [] });
        return this.resumeService.getFullResume(profile.id);
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (res) => {
        if (res.profile) {
          this.handleSuccess(res.profile, res.sections);
        } else {
          this.mostrarSinHojaODerror();
        }
      },
      error: (err) => this.alFallarCarga(err)
    });
  }

  private alFallarCarga(err: unknown): void {
    this.loading = false;

    const codigo = err instanceof HttpErrorResponse ? err.status : 0;
    if (codigo === 404) {
      this.mostrarSinHojaODerror();
      return;
    }

    console.warn('[CV] CV no disponible para este usuario:', err);
    if (codigo === 401 || codigo === 403) {
      this.setError('Inicia sesión para ver esta hoja de vida.');
      return;
    }
    this.setError('No pudimos cargar tu hoja de vida. Intenta de nuevo en unos segundos.');
  }

  private mostrarSinHojaODerror() {
    if (this.esPropietario) {
      this.sinHojaDeVida = true;
      this.loading = false;
      return;
    }
    this.setError();
  }

  crearHojaDeVida() {
    const userId = this.authService.currentUser()?.id;
    if (!userId || this.creandoHojaDeVida) return;

    this.creandoHojaDeVida = true;
    this.resumeSave.ensureProfile(userId).pipe(
      finalize(() => this.creandoHojaDeVida = false)
    ).subscribe({
      next: (profile) => {
        if (profile?.id) {
          this.toast.show('Hoja de vida creada');
          this.resolverPerfil();
        } else {
          this.toast.show('No se pudo crear la hoja de vida');
        }
      },
      error: () => this.toast.show('No se pudo crear la hoja de vida')
    });
  }

  /** La hoja de vida la arma el backend con PDFBox; aquí solo se baja el blob. */
  descargarPdf(event?: Event) {
    if (event) event.preventDefault();
    if (!this.profileId || this.generandoPdf) return;

    this.generandoPdf = true;
    this.resumeService.descargarPdf(this.profileId).pipe(
      finalize(() => this.generandoPdf = false)
    ).subscribe({
      next: (blob) => this.guardarArchivo(blob),
      error: () => this.toast.show('No se pudo generar la hoja de vida'),
    });
  }

  private async guardarArchivo(blob: Blob): Promise<void> {
    const slug = (this.perfilCv?.publicSlug || this.nombre)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const nombre = `hoja-de-vida-${slug || 'cv'}.pdf`;
    try {
      const resultado = await this.archivos.descargar(blob, nombre, 'Hoja de vida');
      this.toast.show(
        resultado === 'cancelado' ? 'Se cerró sin guardar el PDF.' : 'Hoja de vida descargada'
      );
    } catch {
      this.toast.show('No se pudo guardar la hoja de vida en este dispositivo');
    }
  }

  toggleVisibilidad() {
    if (!this.profileId) return;

    this.cambiandoVisibilidad = true;
    this.esPublico = !this.esPublico;

    const accion$ = this.esPublico
      ? this.resumeSave.publishProfile(this.profileId)
      : this.resumeSave.unpublishProfile(this.profileId);

    accion$.subscribe({
      next: (profile) => {
        if (profile && profile.isPublic !== undefined) {
          this.esPublico = profile.isPublic;
        }
        this.cambiandoVisibilidad = false;
      },
      error: (err) => {
        console.error('❌ [CV] Error al guardar en BD:', err);
        this.esPublico = !this.esPublico;
        this.cambiandoVisibilidad = false;
      }
    });
  }

  private loadById(id: number) {
    this.resumeService.getFullResume(id).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: ({ profile, sections }) => this.handleSuccess(profile, sections),
      error: (err) => {
        console.error(`Error cargando CV por ID ${id}:`, err);
        this.setError();
      }
    });
  }

  private loadBySlug(slug: string) {
    this.resumeService.getProfileBySlug(slug).pipe(
      switchMap(profile => {
        if (!profile || !profile.id) return of({ profile: null, sections: [] });
        return this.resumeService.getFullResume(profile.id);
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (res) => {
        if (res.profile) {
          this.handleSuccess(res.profile, res.sections);
        } else {
          this.setError();
        }
      },
      error: (err) => {
        console.warn('[CV] CV no disponible públicamente:', err);
        this.setError();
      }
    });
  }

  private loadByFullName(fullName: string) {
    this.resumeService.getProfileByFullName(fullName).pipe(
      switchMap(profile => {
        if (!profile || !profile.id) return of({ profile: null, sections: [] });
        return this.resumeService.getFullResume(profile.id);
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (res) => {
        if (res.profile) {
          this.handleSuccess(res.profile, res.sections);
        } else {
          this.setError();
        }
      },
      error: (err) => {
        console.error('[CV] No se encontró por nombre:', err);
        this.setError();
      }
    });
  }

  private handleSuccess(profile: ResumeProfile, sections: ResumeSection[]) {
    this.errorMessage = null; 
    this.profileId = profile.id ?? null;
    this.esPublico = !!profile.isPublic;

    // Si el CV es del usuario logueado, se considera dueño (aunque venga por la URL pública)
    const usuarioActual = this.authService.currentUser();
    if (usuarioActual?.id && profile.userProfileId === usuarioActual.id) {
      this.esPropietario = true;
    }
    this.perfilCv = profile;
    this.seccionesRaw = sections ?? [];
    this.mapProfile(profile);
    this.mapSections(sections);
    this.loading = false;
  }

  private setError(customMessage?: string) {
    this.errorMessage = customMessage || 'El CV que buscas no existe o ha sido configurado como privado por su dueño.';
    this.loading = false;
  }

  private mapProfile(profile: ResumeProfile) {
    this.nombre = profile.fullName || 'Sin nombre';
    this.iniciales = this.generarIniciales(this.nombre);

    const fotoGuardada = profile.photoUrl ?? profile.avatarUrl ?? null;
    this.photoUrl = fotoGuardada?.trim() || null;
    if (fotoGuardada === null) this.aplicarFotoPredeterminadaDelPerfil(profile.userProfileId);
    this.rol = profile.headline || '';
    this.perfilProfesional = profile.summary || '';
    this.welcomeDesc = profile.shortBio || '';
    if (profile.resumePdfUrl) this.resumePdfUrl = profile.resumePdfUrl;

    const contactoRaw = [
      { icono: 'fas fa-envelope', texto: profile.email },
      { icono: 'fas fa-phone', texto: profile.phone },
      { icono: 'fas fa-map-marker-alt', texto: profile.location },
      { icono: 'fab fa-github', texto: profile.githubUrl }
    ];
    this.contacto = contactoRaw.filter(c => c.texto != null && c.texto.trim() !== '');
  }

  /** Sin foto propia en el CV: se usa la del perfil social y, si no hay, quedan las iniciales. */
  private aplicarFotoPredeterminadaDelPerfil(userProfileId?: string): void {
    if (!userProfileId) return;

    this.userProfile.getPerfilCompletoPorId(userProfileId).subscribe({
      next: (perfil) => {
        const avatar = (perfil?.avatarUrl || '').trim();
        if (avatar && !this.photoUrl) this.photoUrl = avatar;
      },
      error: () => { /* sin foto de perfil: el avatar grande muestra las iniciales */ }
    });
  }

  private generarIniciales(fullName: string): string {
    if (!fullName || fullName.trim() === '') return '?';
    const partes = fullName.trim().split(/\s+/).filter(p => p.length > 0);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  private mapSections(sections: ResumeSection[]) {
    sections.forEach(sec => {
      if (sec.sectionKey === 'experience') {
        this.experiencia = sec.items?.map(item => ({
          empresa: item.content.empresa,
          cargo: item.content.cargo,
          fecha: item.content.fecha,
          descripcion: item.content.descripcion || item.content.detalles || item.content.description || ''
        })) || [];
      } else if (sec.sectionKey === 'education') {
        this.formacion = sec.items?.map(item => ({
          year: item.content.year, titulo: item.content.titulo, institucion: item.content.institucion
        })) || [];
      } else if (sec.sectionKey === 'skill') {
        this.tecnologias = sec.items?.map(item => ({
          nombre: item.content.nombre, icono: item.content.icono
        })) || [];
      } else if (sec.sectionKey === 'metric') {
        this.metricas = sec.items?.map(item => ({
          titulo: item.content.titulo, valor: item.content.valor, tendencia: item.content.tendencia,
          icono: item.content.icono, color: item.content.color
        })) || [];
      }
    });
  }

  // ====== BLOQUES ADICIONALES (secciones sin diseño dedicado) ======

  /** Secciones que el backend no tiene predefinidas: se pintan como cuadro grande con sus items dentro. */
  get seccionesPersonalizadas(): { titulo: string; icono: string; items: { cabecera: string; detalle: string; meta: string }[] }[] {
    return this.seccionesRaw
      .filter(sec => !this.CLAVES_CONOCIDAS.includes(sec.sectionKey))
      .map(sec => ({
        titulo: sec.title,
        icono: sec.icon ?? '',
        items: (sec.items ?? []).map(item => this.proyectarItem(item.content))
      }))
      .filter(sec => sec.items.length > 0);
  }

  private proyectarItem(content: Record<string, any>): { cabecera: string; detalle: string; meta: string } {
    return {
      cabecera: this.primeraClave(content, this.CLAVES_CABECERA) || 'Sin título',
      detalle: this.primeraClave(content, this.CLAVES_DETALLE),
      meta: this.primeraClave(content, this.CLAVES_META),
    };
  }

  private primeraClave(content: Record<string, any>, claves: string[]): string {
    if (!content) return '';
    for (const clave of claves) {
      const texto = this.textoDe(content[clave]);
      if (texto) return texto;
    }
    // Ninguna clave conocida: usa el primer valor legible que exista.
    for (const valor of Object.values(content)) {
      const texto = this.textoDe(valor);
      if (texto) return texto;
    }
    return '';
  }

  /** Un arreglo se muestra como lista de líneas; el resto se convierte a texto. */
  private textoDe(valor: any): string {
    if (valor == null) return '';
    if (Array.isArray(valor)) {
      return valor.map(v => this.textoDe(typeof v === 'object' ? (v?.titulo ?? v?.text ?? v?.value) : v))
        .filter(Boolean)
        .join('\n');
    }
    if (typeof valor === 'object') return '';
    return String(valor).trim();
  }

  /** El backend guarda emoji ("💼") o clases de FontAwesome; la vista debe distinguirlos. */
  esIconoFontAwesome(icono: string): boolean {
    return /^fa[a-z-]*\s+fa-[a-z0-9-]+$/.test((icono ?? '').trim());
  }

  // ====== MODO EDICIÓN ======

  iniciarEdicion() {
    this.llenarForm();
    this.seccionesEditables = this.seccionesRaw.map(sec => this.aEditable(sec));
    this.editando = true;
  }

  cancelarEdicion() {
    this.editando = false;
    this.seccionesEditables = [];
  }

  private llenarForm() {
    const p: ResumeProfile = this.perfilCv ?? {};
    this.form = {
      headline: p.headline ?? '',
      summary: p.summary ?? '',
      shortBio: p.shortBio ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      location: p.location ?? '',
      githubUrl: p.githubUrl ?? '',
      linkedinUrl: p.linkedinUrl ?? '',
      avatarUrl: this.photoUrl ?? p.avatarUrl ?? p.photoUrl ?? '',
      resumePdfUrl: p.resumePdfUrl ?? '',
    };
    this.avatarAlEditar = this.form.avatarUrl;
  }

  /**
   * Un solo guardado para todo el editor: antes cada sección y cada ítem tenían
   * su propio botón y el usuario no sabía cuál había persistido.
   */
  async guardarTodo(): Promise<void> {
    if (!this.profileId || this.guardando) return;

    if (this.seccionesEditables.some(sec => !sec.title.trim())) {
      this.toast.show('Cada sección necesita un título');
      return;
    }

    this.guardando = true;
    try {
      await firstValueFrom(this.resumeSave.updateProfile(this.profileId, this.payloadDelPerfil()));
      await Promise.all(
        this.seccionesEditables.map((seccion, orden) => this.guardarSeccionDe(seccion, orden))
      );

      this.toast.show('CV guardado');
      this.recargar();
    } catch {
      this.toast.show('No se pudo guardar el CV');
    } finally {
      this.guardando = false;
    }
  }

  private payloadDelPerfil(): Partial<ResumeProfile> {
    const payload: Partial<ResumeProfile> = {
      ...this.form,
      publicSlug: this.perfilCv?.publicSlug ?? undefined,
      isPublic: this.esPublico,
    };

    if (payload.avatarUrl === this.avatarAlEditar) delete payload.avatarUrl;
    return payload;
  }

  private async guardarSeccionDe(seccion: SeccionEditable, orden: number): Promise<void> {
    if (!this.profileId) return;
    seccion.displayOrder = orden;

    if (seccion.nueva || this.seccionCambió(seccion, orden)) {
      const payload = {
        sectionKey: seccion.sectionKey,
        title: seccion.title.trim(),
        icon: seccion.icon,
        displayOrder: seccion.displayOrder,
        isActive: seccion.isActive,
      };

      const guardada = seccion.nueva
        ? await firstValueFrom(this.resumeSave.crearSeccion(this.profileId, payload))
        : await firstValueFrom(this.resumeSave.actualizarSeccion(seccion.id!, payload));

      seccion.id = guardada.id ?? seccion.id;
      seccion.nueva = false;
    }

    const porGuardar = seccion.items.filter(item => item.nuevo || this.itemCambió(item));
    await Promise.all(porGuardar.map(item => this.guardarItemDe(seccion, item)));
  }

  private seccionCambió(seccion: SeccionEditable, orden: number): boolean {
    const original = this.seccionesRaw.find(s => s.id === seccion.id);
    if (!original) return true;

    return original.title !== seccion.title.trim()
      || original.icon !== seccion.icon
      || original.isActive !== seccion.isActive
      || original.displayOrder !== orden;
  }

  private itemCambió(item: ItemEditable): boolean {
    const nuevo = this.contenidoDe(item);
    const anterior = item.original ?? {};
    const claves = new Set([...Object.keys(nuevo), ...Object.keys(anterior)]);

    for (const clave of claves) {
      const n = JSON.stringify(nuevo[clave] ?? '');
      const a = JSON.stringify(anterior[clave] ?? '');
      if (n !== a) return true;
    }
    return false;
  }

  private async guardarItemDe(seccion: SeccionEditable, item: ItemEditable): Promise<void> {
    const content = this.contenidoDe(item);
    if (Object.values(content).every(v => v === '' || v === null || v === undefined)) return;

    const payload = { content, displayOrder: seccion.items.indexOf(item), source: item.source };

    const guardado = item.nuevo
      ? await firstValueFrom(this.resumeSave.crearItem(seccion.id!, payload))
      : await firstValueFrom(this.resumeSave.actualizarItem(item.id!, payload));

    item.id = guardado.id ?? item.id;
    item.nuevo = false;
    item.abierto = false;
    item.original = content;
    item.pares = this.paresDe(content);
  }

  // ====== GESTOR DE SECCIONES ======

  private aEditable(sec: ResumeSection): SeccionEditable {
    return {
      id: sec.id,
      sectionKey: sec.sectionKey,
      title: sec.title,
      icon: sec.icon,
      displayOrder: sec.displayOrder,
      isActive: sec.isActive,
      items: (sec.items ?? []).map(item => ({
        id: item.id,
        original: item.content ?? {},
        pares: this.paresDe(item.content),
        source: item.source ?? 'manual',
        nuevo: false,
        abierto: false,
      })),
      nueva: false,
    };
  }

  private paresDe(content: Record<string, any>): ParContenido[] {
    if (!content) return [];
    return Object.entries(content)
      .filter(([, valor]) => typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean')
      .map(([clave, valor]) => ({ clave, valor: String(valor) }));
  }

  private contenidoDe(item: ItemEditable): Record<string, any> {
    const contenido: Record<string, any> = {};

    item.pares.forEach(par => {
      const clave = par.clave.trim();
      if (clave) contenido[clave] = par.valor.trim();
    });

    // Lo que no es editable aquí (arreglos, objetos) se conserva intacto.
    Object.entries(item.original).forEach(([clave, valor]) => {
      if (!(clave in contenido) && typeof valor === 'object' && valor !== null) {
        contenido[clave] = valor;
      }
    });

    return contenido;
  }

  agregarSeccion() {
    this.seccionesEditables.push({
      sectionKey: `custom_${Date.now().toString(36)}`,
      title: 'Nueva sección',
      icon: 'fas fa-layer-group',
      displayOrder: this.seccionesEditables.length,
      isActive: true,
      items: [],
      nueva: true,
    });
  }

  eliminarSeccion(seccion: SeccionEditable) {
    if (!seccion.id) {
      this.seccionesEditables = this.seccionesEditables.filter(s => s !== seccion);
      return;
    }
    if (!confirm(`¿Eliminar la sección "${seccion.title}" y todos sus items? No se puede deshacer.`)) return;

    this.resumeSave.eliminarSeccion(seccion.id).subscribe({
      next: () => {
        this.seccionesEditables = this.seccionesEditables.filter(s => s !== seccion);
        this.toast.show('Sección eliminada');
        this.recargar();
      },
      error: () => this.toast.show('No se pudo eliminar la sección'),
    });
  }

  // ====== GESTOR DE ITEMS ======

  alternarItem(item: ItemEditable) {
    item.abierto = !item.abierto;
  }

  /** Texto que identifica al ítem en la lista del gestor: nunca un ícono. */
  resumenDe(item: ItemEditable): string {
    for (const clave of this.CLAVES_CABECERA) {
      const valor = this.parPorClave(item, clave);
      if (valor) return valor;
    }
    for (const par of item.pares) {
      if (this.esCampoIcono(par)) continue;
      const valor = par.valor.trim();
      if (valor) return valor;
    }
    return item.nuevo ? 'Ítem nuevo (sin guardar)' : 'Ítem sin título';
  }

  private parPorClave(item: ItemEditable, clave: string): string | null {
    const par = item.pares.find(p => p.clave.trim().toLowerCase() === clave && p.valor.trim());
    if (!par || this.esValorIcono(par)) return null;
    return par.valor;
  }

  /** Los campos se muestran con nombre amable y en orden: título, detalle, fechas, resto. */
  paresOrdenados(item: ItemEditable): ParContenido[] {
    const peso = (par: ParContenido): number => {
      const clave = par.clave.trim().toLowerCase();
      if (this.CLAVES_CABECERA.indexOf(clave) >= 0) return 0;
      if (this.CLAVES_DETALLE.indexOf(clave) >= 0) return 1;
      if (this.CLAVES_META.indexOf(clave) >= 0) return 2;
      if (this.CLAVES_ICONO.indexOf(clave) >= 0) return 4;
      return 3;
    };
    return [...item.pares].sort((a, b) => peso(a) - peso(b));
  }

  etiquetaDe(clave: string): string {
    const limpia = (clave ?? '').trim().toLowerCase();
    if (!limpia) return 'Nuevo campo';
    return this.ETIQUETAS[limpia] ?? clave;
  }

  esCampoIcono(par: ParContenido): boolean {
    const clave = par.clave.trim().toLowerCase();
    return this.CLAVES_ICONO.indexOf(clave) >= 0 || this.esValorIcono(par);
  }

  /** true cuando el valor es una clase de FontAwesome, p. ej. "fab fa-java" o "fa-brands fa-x-twitter". */
  esValorIcono(par: ParContenido): boolean {
    return this.esIconoFontAwesome(par.valor);
  }

  /** El ícono que representa al ítem: basta con que algún valor sea una clase de FontAwesome. */
  iconoDelItem(item: ItemEditable): string {
    const par = item.pares.find(p => this.esValorIcono(p));
    return par ? par.valor.trim() : '';
  }

  fuenteDe(item: ItemEditable): string {
    switch (item.source) {
      case 'chat': return 'Chat';
      case 'pdf_import': return 'PDF';
      default: return 'Manual';
    }
  }

  agregarItem(seccion: SeccionEditable) {
    const plantilla = this.PLANTILLAS[seccion.sectionKey] ?? this.PLANTILLA_LIBRE;

    seccion.items.push({
      original: {},
      pares: plantilla.map(([clave, valor]) => ({ clave, valor })),
      source: 'manual',
      nuevo: true,
      abierto: true,
    });
  }

  /** Crea una de las secciones diseñadas del CV sin necesidad de importar un PDF. */
  agregarSeccionBase(base: { sectionKey: string; title: string; icon: string }) {
    if (this.tieneSeccion(base.sectionKey)) return;

    this.seccionesEditables.push({
      sectionKey: base.sectionKey,
      title: base.title,
      icon: base.icon,
      displayOrder: this.seccionesEditables.length,
      isActive: true,
      items: [],
      nueva: true,
    });
  }

  tieneSeccion(sectionKey: string): boolean {
    return this.seccionesEditables.some(sec => sec.sectionKey === sectionKey);
  }

  eliminarItem(seccion: SeccionEditable, item: ItemEditable) {
    if (!item.id) {
      seccion.items = seccion.items.filter(i => i !== item);
      return;
    }
    if (!confirm('¿Eliminar este item?')) return;

    this.resumeSave.eliminarItem(item.id).subscribe({
      next: () => {
        seccion.items = seccion.items.filter(i => i !== item);
        this.toast.show('Item eliminado');
        this.recargar();
      },
      error: () => this.toast.show('No se pudo eliminar el item'),
    });
  }

  agregarPar(item: ItemEditable) {
    item.pares.push({ clave: '', valor: '' });
  }

  quitarPar(item: ItemEditable, par: ParContenido) {
    const indice = item.pares.indexOf(par);
    if (indice >= 0) item.pares.splice(indice, 1);
  }

  /** Vuelve a leer el CV desde la BD para que la vista quede sincronizada. */
  private recargar() {
    if (!this.profileId) return;
    this.resumeService.getFullResume(this.profileId).subscribe({
      next: (res) => {
        if (res.profile) {
          this.perfilCv = res.profile;
          this.seccionesRaw = res.sections ?? [];
          this.mapProfile(res.profile);
          this.mapSections(res.sections ?? []);
        }
        if (this.editando) {
          const abiertas = new Set(this.seccionesEditables.filter(s => !s.nueva).map(s => s.sectionKey));
          this.seccionesEditables = [
            ...this.seccionesRaw.filter(s => abiertas.has(s.sectionKey)).map(s => this.aEditable(s)),
            ...this.seccionesEditables.filter(s => s.nueva),
          ];
        }
      },
      error: () => this.toast.show('No se pudo refrescar el CV'),
    });
  }

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
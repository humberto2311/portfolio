import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { switchMap, finalize, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { ResumeService } from '../../core/services/resume.service';
import { ResumeSaveService } from '../../core/services/resume-save.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
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

  /** Copia editable de las secciones; se reconstruye al entrar en modo edición. */
  public seccionesEditables: SeccionEditable[] = [];

  /** Las que ya tienen su propio bloque visual no se repiten abajo. */
  private readonly CLAVES_CONOCIDAS = ['experience', 'education', 'skill', 'metric', 'contact'];

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

  private perfilCv: ResumeProfile | null = null;
  private seccionesRaw: ResumeSection[] = [];

  ngOnInit() {
    this.resolverPerfil();
  }

  private resolverPerfil() {
    this.loading = true;
    this.errorMessage = null;

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
      this.ensureAndLoad(currentUser.id);
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
          this.setError();
        }
      },
      error: (err) => {
        console.warn('[CV] CV no disponible para este usuario:', err);
        this.setError();
      }
    });
  }

  private ensureAndLoad(userId: string) {
    this.resumeSave.ensureProfile(userId).subscribe({
      next: (profile) => {
        if (profile && profile.id) {
          this.profileId = profile.id;
          this.esPublico = !!profile.isPublic;
          
          this.resumeService.getFullResume(profile.id).subscribe({
            next: (res) => {
              if (res.profile) {
                this.handleSuccess(res.profile, res.sections);
              } else {
                this.setError();
              }
            },
            error: (err) => {
              console.error('Error cargando secciones:', err);
              this.handleSuccess(profile, []); 
            }
          });
        } else {
          this.setError();
        }
      },
      error: (err) => {
        console.error('❌ [CV] Error en ensureProfile:', err);
        this.resumeService.getProfileByUserId(userId).subscribe({
          next: (profile) => {
            if (profile && profile.id) {
              this.profileId = profile.id;
              this.esPublico = !!profile.isPublic;
              this.resumeService.getFullResume(profile.id).subscribe({
                next: (res) => this.handleSuccess(res.profile, res.sections),
                error: () => this.setError()
              });
            } else {
              this.setError();
            }
          },
          error: () => this.setError()
        });
      }
    });
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
    this.photoUrl = profile.photoUrl?.trim() || profile.avatarUrl?.trim() || null;
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
    return /^fa(-|\s)/.test(icono ?? '');
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
      avatarUrl: p.avatarUrl ?? p.photoUrl ?? '',
      resumePdfUrl: p.resumePdfUrl ?? '',
    };
  }

  guardarPerfil() {
    if (!this.profileId || this.guardando) return;
    this.guardando = true;

    // El backend copia estos campos uno a uno: hay que reenviar isPublic y publicSlug
    // o el PUT los deja en null (el CV quedaría sin publicar y sin enlace público).
    const payload = {
      ...this.form,
      publicSlug: this.perfilCv?.publicSlug ?? undefined,
      isPublic: this.esPublico,
    };

    this.resumeSave.updateProfile(this.profileId, payload).pipe(
      finalize(() => this.guardando = false)
    ).subscribe({
      next: (profile) => {
        this.handleSuccess(profile, this.seccionesRaw);
        this.toast.show('Datos del CV actualizados');
      },
      error: () => this.toast.show('No se pudieron guardar los datos'),
    });
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

  guardarSeccion(seccion: SeccionEditable) {
    if (!this.profileId) return;
    if (!seccion.title.trim()) {
      this.toast.show('La sección necesita un título');
      return;
    }

    const payload = {
      sectionKey: seccion.sectionKey,
      title: seccion.title.trim(),
      icon: seccion.icon,
      displayOrder: seccion.displayOrder,
      isActive: seccion.isActive,
    };

    const peticion$ = seccion.nueva
      ? this.resumeSave.crearSeccion(this.profileId, payload)
      : this.resumeSave.actualizarSeccion(seccion.id!, payload);

    peticion$.subscribe({
      next: () => {
        seccion.nueva = false;
        this.toast.show(`Sección "${payload.title}" guardada`);
        this.recargar();
      },
      error: () => this.toast.show('No se pudo guardar la sección'),
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
    return /^fa(?:-[a-z]+)?\s+fa-[a-z0-9-]+$/.test(par.valor.trim());
  }

  /** El ícono que representa al ítem, si lo tiene. */
  iconoDelItem(item: ItemEditable): string {
    const par = item.pares.find(p => this.esCampoIcono(p) && this.esValorIcono(p));
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
    seccion.items.push({
      original: {},
      pares: [
        { clave: 'titulo', valor: '' },
        { clave: 'detalle', valor: '' },
        { clave: 'fecha', valor: '' },
      ],
      source: 'manual',
      nuevo: true,
      abierto: true,
    });
  }

  guardarItem(seccion: SeccionEditable, item: ItemEditable) {
    if (!seccion.id) {
      this.toast.show('Guarda primero la sección');
      return;
    }

    const content = this.contenidoDe(item);
    if (Object.values(content).every(v => v === '' || v === null)) {
      this.toast.show('El item no tiene contenido');
      return;
    }

    const payload = { content, displayOrder: seccion.items.indexOf(item), source: item.source };

    const peticion$ = item.nuevo
      ? this.resumeSave.crearItem(seccion.id, payload)
      : this.resumeSave.actualizarItem(item.id!, payload);

    peticion$.subscribe({
      next: (guardado) => {
        item.id = guardado.id ?? item.id;
        item.nuevo = false;
        item.abierto = false;
        item.original = content;
        item.pares = this.paresDe(content);
        this.toast.show('Item guardado');
        this.recargar();
      },
      error: () => this.toast.show('No se pudo guardar el item'),
    });
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
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

  // ====== EDICIÓN DE LA HOJA DE VIDA ======
  public editando = false;
  public guardando = false;

  public form = {
    fullName: '',
    headline: '',
    summary: '',
    shortBio: '',
    email: '',
    phone: '',
    location: '',
    githubUrl: '',
    experiencia: [] as any[],
    formacion: [] as any[],
    tecnologias: [] as any[],
  };

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
      
      // 👇 VALIDACIÓN DE SEGURIDAD: Detectar si es UUID o ID numérico
      const esUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(urlParam);
      const esIDNumerico = /^\d+$/.test(urlParam);

      // Si estamos en la zona pública (no es edición) y tratan de buscar por ID interno, lo bloqueamos.
      if ((esUUID || esIDNumerico) && !isEditRoute) {
        this.setError('Por motivos de seguridad, no se permite buscar currículums por ID interno. Utiliza el nombre de usuario o el enlace directo.');
        return;
      }

      if (esUUID) {
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

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
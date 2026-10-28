import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { switchMap, finalize, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ResumeService } from '../../core/services/resume.service';
import { ResumeSaveService } from '../../core/services/resume-save.service';
import { AuthService } from '../../core/services/auth.service';
import { ResumeProfile, ResumeSection } from '../../core/models/resume.model';

@Component({
  selector: 'app-informacion-personal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './informacion-personal.component.html',
  styleUrls: ['./informacion-personal.component.scss']
})
export class InformacionPersonalComponent implements OnInit {
  private resumeService = inject(ResumeService);
  private resumeSave = inject(ResumeSaveService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public loading = true;

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
  public esPropietario = false; // Controla si se muestra el botón Público/Privado
  public cambiandoVisibilidad = false;

  private readonly DEFAULT_FULL_NAME = 'Humberto Jose Lozano Verbel';

  ngOnInit() {
    this.resolverPerfil();
  }

  private resolverPerfil() {
    const urlParam = this.route.snapshot.paramMap.get('username') || this.route.snapshot.paramMap.get('id');
    const isEditRoute = this.router.url.includes('/app/informacion-personal');

    // 1) Si hay URL param (ej. /u/humberto o /u/123), es público
    if (urlParam) {
      this.esPropietario = false;
      if (/^\d+$/.test(urlParam)) {
        this.loadById(Number(urlParam));
      } else {
        this.loadBySlug(urlParam);
      }
      return;
    }

    // 2) Si es modo edición, o no hay URL param
    const currentUser = this.authService.currentUser();
    
    if (currentUser && currentUser.id) {
      // Está logueado, puede editar
      this.esPropietario = true;
      this.ensureAndLoad(currentUser.id);
    } else {
      // No está logueado
      if (isEditRoute) {
        // Si intenta editar sin loguearse, lo sacamos
        this.loading = false;
        this.router.navigate(['/']); 
      } else {
        // Es un visitante anónimo viendo la página pública, mostramos a Humberto
        this.esPropietario = false;
        this.loadByFullName(this.DEFAULT_FULL_NAME);
      }
    }
  }

   private ensureAndLoad(userId: string) {
    this.resumeSave.ensureProfile(userId).subscribe({
      next: (profile) => {
        // 🔥 AQUÍ CAPTURAMOS EL ID Y LO GUARDAMOS
        if (profile && profile.id) {
          this.profileId = profile.id;
          console.log('✅ [CV] ID del perfil capturado:', this.profileId);
          this.esPublico = !!profile.isPublic;
          
          // Ahora cargamos el CV completo con ese ID
          this.resumeService.getFullResume(profile.id).subscribe({
            next: (res) => {
              if (res.profile) {
                this.handleSuccess(res.profile, res.sections);
              } else {
                this.loading = false;
              }
            },
            error: (err) => {
              console.error('Error cargando secciones:', err);
              // Si fallan las secciones, al menos mostramos el perfil básico
              this.handleSuccess(profile, []);
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('❌ [CV] Error en ensureProfile:', err);
        // Fallback: si falla el ensure, buscamos por userId
        this.resumeService.getProfileByUserId(userId).subscribe({
          next: (profile) => {
            if (profile && profile.id) {
              this.profileId = profile.id;
              this.esPublico = !!profile.isPublic;
              this.resumeService.getFullResume(profile.id).subscribe(res => {
                this.handleSuccess(res.profile, res.sections);
              });
            } else {
              this.loading = false;
            }
          },
          error: () => this.loading = false
        });
      }
    });
  }

  toggleVisibilidad() {
    // 👇 Imprimimos para verificar si el ID llegó
    console.log('Intentando cambiar visibilidad. ID actual:', this.profileId);

    if (!this.profileId) {
      console.error('❌ [CV] ERROR: No hay profileId para cambiar la visibilidad.');
      return;
    }

    this.cambiandoVisibilidad = true;
    this.esPublico = !this.esPublico; // Cambio visual inmediato

    const accion$ = this.esPublico
      ? this.resumeSave.publishProfile(this.profileId)
      : this.resumeSave.unpublishProfile(this.profileId);

    accion$.subscribe({
      next: (profile) => {
        console.log('✅ [CV] Respuesta del backend:', profile);
        if (profile && profile.isPublic !== undefined) {
          this.esPublico = profile.isPublic;
        }
        this.cambiandoVisibilidad = false;
      },
      error: (err) => {
        console.error('❌ [CV] Error al guardar en BD:', err);
        this.esPublico = !this.esPublico; // Revertimos
        this.cambiandoVisibilidad = false;
      }
    });
  }
  private loadById(id: number) {
    this.resumeService.getFullResume(id).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: ({ profile, sections }) => this.handleSuccess(profile, sections),
      error: (err) => console.error(`Error cargando CV por ID ${id}:`, err)
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
        if (res.profile) this.handleSuccess(res.profile, res.sections);
      },
      error: (err) => {
        console.warn('[CV] CV no disponible públicamente:', err);
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
        if (res.profile) this.handleSuccess(res.profile, res.sections);
      },
      error: (err) => {
        console.error('[CV] No se encontró por nombre:', err);
      }
    });
  }

  private handleSuccess(profile: ResumeProfile, sections: ResumeSection[]) {
    this.profileId = profile.id ?? null;
    this.esPublico = !!profile.isPublic;
    this.mapProfile(profile);
    this.mapSections(sections);
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
          empresa: item.content.empresa, cargo: item.content.cargo, fecha: item.content.fecha
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
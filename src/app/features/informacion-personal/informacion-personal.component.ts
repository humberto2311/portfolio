import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ResumeService } from '../../core/services/resume.service'; // Ajusta tu ruta
import { ResumeProfile, ResumeSection } from '../../core/models/resume.model'; // Ajusta tu ruta

@Component({
  selector: 'app-informacion-personal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './informacion-personal.component.html',
  styleUrls: ['./informacion-personal.component.scss']
})
export class InformacionPersonalComponent implements OnInit {
  private resumeService = inject(ResumeService);
  
  public loading = true;
  public profileId = 1; // El ID que creaste en la BD

  // Variables dinámicas
  public nombre = '';
  public rol = '';
  public perfilProfesional = '';
  public resumePdfUrl = 'assets/docs/HOJADEVIDA-HUMBERTOLOZANOVERBEL.pdf'; // Fallback

  public contacto: any[] = [];
  public experiencia: any[] = [];
  public formacion: any[] = [];
  public tecnologias: any[] = [];
  public welcomeDesc = '';

  // Mantenemos las métricas estáticas por ahora (o las puedes guardar en BD después)
  public metricas: any[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.resumeService.getFullResume(this.profileId).subscribe({
      next: ({ profile, sections }) => {
        this.mapProfile(profile);
        this.mapSections(sections);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando el CV:', err);
        this.loading = false;
      }
    });
  }

  private mapProfile(profile: ResumeProfile) {
    this.nombre = profile.fullName;
    this.rol = profile.headline;
    this.perfilProfesional = profile.summary;
    this.welcomeDesc = profile.shortBio || '';
    if (profile.resumePdfUrl) this.resumePdfUrl = profile.resumePdfUrl;

    // Armamos el array de contacto y filtramos los nulos/vacíos
    const contactoRaw = [
      { icono: '✉️', texto: profile.email },
      { icono: '📞', texto: profile.phone },
      { icono: '📍', texto: profile.location },
      { icono: '💻', texto: profile.githubUrl }
    ];

    this.contacto = contactoRaw.filter(c => c.texto != null && c.texto.trim() !== '');
  }


private mapSections(sections: ResumeSection[]) {
  sections.forEach(sec => {
    if (sec.sectionKey === 'experience') {
      this.experiencia = sec.items?.map(item => ({
        empresa: item.content.empresa,
        cargo: item.content.cargo,
        fecha: item.content.fecha
      })) || [];
    } 
    else if (sec.sectionKey === 'education') {
      this.formacion = sec.items?.map(item => ({
        year: item.content.year,
        titulo: item.content.titulo,
        institucion: item.content.institucion
      })) || [];
    }
    else if (sec.sectionKey === 'skill') {
      this.tecnologias = sec.items?.map(item => ({
        nombre: item.content.nombre,
        icono: item.content.icono
      })) || [];
    }
    // 2. 👇 NUEVO: Mapeamos las métricas desde la BD
    else if (sec.sectionKey === 'metric') {
      this.metricas = sec.items?.map(item => ({
        titulo: item.content.titulo,
        valor: item.content.valor,
        tendencia: item.content.tendencia,
        icono: item.content.icono,
        color: item.content.color
      })) || [];
    }
  });
}

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
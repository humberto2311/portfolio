import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilData } from '../../../../core/models/perfil.model';
import { ResumeService } from '../../../../core/services/resume.service';

interface LineaCv {
  titulo: string;
  lugar?: string;
  periodo?: string;
  detalle?: string;
}

@Component({
  selector: 'app-tab-informacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-informacion.component.html',
  styleUrls: ['./tab-informacion.component.scss']
})
export class TabInformacionComponent implements OnChanges {
  @Input({ required: true }) perfil!: PerfilData;

  private resumeService = inject(ResumeService);

  experiencia: LineaCv[] = [];
  estudios: LineaCv[] = [];
  tecnologias: string[] = [];
  idiomas: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['perfil'] && this.perfil?.id) {
      this.cargarCv();
    }
  }

  /**
   * La info de la hoja de vida importada se reparte en las cajas de
   * Experiencia, Estudios y Pila tecnológica (sin bloque aparte).
   */
  private cargarCv(): void {
    this.experiencia = [];
    this.estudios = [];
    this.tecnologias = [];
    this.idiomas = [];

    this.resumeService.getProfileByUserId(this.perfil.id).subscribe({
      next: (rp) => {
        if (!rp?.id) {
          this.usarPerfil();
          return;
        }

        this.resumeService.getFullResume(rp.id).subscribe({
          next: ({ sections }) => {
            this.aplicarSecciones(sections ?? []);
            this.usarPerfilSiVacio();
          },
          error: () => this.usarPerfil(),
        });
      },
      error: () => this.usarPerfil(),
    });
  }

  private aplicarSecciones(sections: any[]): void {
    for (const seccion of sections) {
      if (seccion?.isActive === false) continue;

      const clave = (seccion.sectionKey ?? '').toLowerCase();
      const items = seccion.items ?? [];

      if (clave.includes('experience') || clave.includes('experiencia')) {
        this.experiencia = items.map((i: any) => this.lineaExperiencia(i.content));
      } else if (clave.includes('education') || clave.includes('formacion')) {
        this.estudios = items.map((i: any) => this.lineaEstudio(i.content));
      } else if (clave.includes('skill') || clave.includes('habilidad')) {
        this.tecnologias = items
          .map((i: any) =>
            this.texto(i.content, ['nombre', 'habilidad', 'skill', 'name', 'tecnologia', 'technology'])
          )
          .filter((t: string) => !!t);
      } else {
        // Secciones "custom": si son idiomas, van en la caja de pila.
        const valores = items
          .map((i: any) => this.texto(i.content, ['idioma', 'language', 'nombre', 'name']))
          // Un idioma es una palabra o dos, nunca un párrafo del PDF
          .filter((t: string) => !!t && t.length <= 40);

        const esIdioma =
          (seccion.title ?? '').toLowerCase().includes('idioma') ||
          clave.includes('idioma') ||
          clave.includes('language');

        if (esIdioma) this.idiomas.push(...valores);
      }
    }
  }

  private lineaExperiencia(content: any): LineaCv {
    return {
      titulo: this.texto(content, ['puesto', 'cargo', 'title', 'titulo', 'role']),
      lugar: this.texto(content, ['empresa', 'company', 'organizacion', 'organization']),
      periodo: this.texto(content, ['periodo', 'fecha', 'date', 'dates']),
      detalle: this.recortar(
        this.texto(content, ['detalles', 'descripcion', 'description', 'summary']),
        160
      ),
    };
  }

  private lineaEstudio(content: any): LineaCv {
    return {
      titulo: this.texto(content, ['titulo', 'title', 'carrera', 'degree']),
      lugar: this.texto(content, ['institucion', 'universidad', 'institution', 'school']),
      periodo: this.texto(content, ['periodo', 'fecha', 'date', 'dates']),
    };
  }

  /** Saca el primer valor de texto útil del JSON libre del ítem. */
  private texto(content: any, claves: string[]): string {
    if (!content) return '';
    if (typeof content === 'string') return content.trim();

    for (const clave of claves) {
      const valor = content[clave];
      if (typeof valor === 'string' && valor.trim()) return valor.trim();
      if (Array.isArray(valor) && valor.length) {
        return valor.filter((v) => typeof v === 'string').join(', ');
      }
    }

    // Nunca se usa el texto crudo del PDF: solo los campos reales del ítem.
    return '';
  }

  private recortar(valor: string, max: number): string | undefined {
    if (!valor) return undefined;
    return valor.length > max ? valor.slice(0, max).trim() + '…' : valor;
  }

  /** Si la hoja de vida no trajo datos, se usa lo que haya en el perfil. */
  private usarPerfilSiVacio(): void {
    if (this.experiencia.length === 0 && (this.perfil.experiencia ?? []).length > 0) {
      this.experiencia = (this.perfil.experiencia ?? []).map((e) => ({
        titulo: e.puesto,
        lugar: e.empresa,
        periodo: e.periodo,
        detalle: this.recortar(e.detalles ?? '', 160),
      }));
    }

    if (this.estudios.length === 0 && (this.perfil.estudios ?? []).length > 0) {
      this.estudios = (this.perfil.estudios ?? []).map((e) => ({
        titulo: e.titulo,
        lugar: e.institucion,
        periodo: e.periodo,
      }));
    }

    if (this.tecnologias.length === 0 && (this.perfil.pilaTecnologica ?? []).length > 0) {
      this.tecnologias = (this.perfil.pilaTecnologica ?? []).flatMap((c) => c.tecnologias ?? []);
    }
  }

  private usarPerfil(): void {
    this.usarPerfilSiVacio();
  }
}

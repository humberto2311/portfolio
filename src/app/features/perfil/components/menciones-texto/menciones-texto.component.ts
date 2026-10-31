import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

interface Parte {
  texto: string;
  username?: string;
}

/**
 * Pinta un texto y convierte cada @usuario en un enlace al perfil.
 * Se usa en posts, comentarios y descripciones compartidas.
 */
@Component({
  selector: 'app-menciones-texto',
  standalone: true,
  template: `
    @for (p of partes; track $index) {
      @if (p.username) {
        <a class="mencion" (click)="irAlPerfil(p.username, $event)">&#64;{{ p.username }}</a>
      } @else {
        {{ p.texto }}
      }
    }
  `,
  styles: [
    `
      :host {
        white-space: pre-wrap;
        word-break: break-word;
      }

      .mencion {
        color: #00f2fe;
        cursor: pointer;
        font-weight: 600;
        text-decoration: none;
      }

      .mencion:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class MencionesTextoComponent {
  partes: Parte[] = [];

  private router = inject(Router);

  @Input({ required: true }) set texto(valor: string) {
    this.partes = this.dividir(valor ?? '');
  }

  private dividir(texto: string): Parte[] {
    const re = /@([\w.\-]+)/g;
    const partes: Parte[] = [];
    let ultimo = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(texto)) !== null) {
      if (match.index > ultimo) {
        partes.push({ texto: texto.slice(ultimo, match.index) });
      }
      partes.push({ texto: match[0], username: match[1] });
      ultimo = match.index + match[0].length;
    }

    if (ultimo < texto.length) {
      partes.push({ texto: texto.slice(ultimo) });
    }

    return partes;
  }

  irAlPerfil(username: string | undefined, event: Event): void {
    event.stopPropagation();
    if (!username) return;
    this.router.navigate(['/app/perfil', username]);
  }
}

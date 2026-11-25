import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuiaComandosComponent } from '../../shared/components/guia-comandos/guia-comandos.component';

@Component({
  selector: 'app-ajustes-comandos',
  standalone: true,
  imports: [CommonModule, GuiaComandosComponent],
  template: `
    <section class="pagina">
      <header class="pagina__cabecera">
        <h1>Comandos</h1>
        <p>Todo lo que puedes pedirle a NFSocial desde un chat, con sus parámetros y ejemplos.</p>
      </header>

      <app-guia-comandos />
    </section>
  `,
  styles: [`
    .pagina {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 860px;
      margin: 0 auto;
      padding: 1.25rem;
      border-radius: 20px;
      background: var(--bg-card, #17171d);
      border: 1px solid var(--bg-border, rgba(255, 255, 255, 0.08));
    }

    .pagina__cabecera h1 {
      margin: 0;
      font-size: 1.3rem;
      color: var(--text-primary, #f2f2f6);
    }

    .pagina__cabecera p {
      margin: 0.25rem 0 0;
      font-size: 0.82rem;
      color: var(--text-muted, #9a9aa8);
    }
  `]
})
export class AjustesComandosComponent {}

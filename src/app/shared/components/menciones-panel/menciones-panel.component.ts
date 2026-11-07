import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SugerenciaUsuario } from '../../../core/services/user-directory.service';

@Component({
  selector: 'app-menciones-panel',
  standalone: true,
  template: `
    <ul class="menciones">
      @for (s of sugerencias; track s.username; let i = $index) {
        <li>
          <button
            type="button"
            [class.activa]="i === activo"
            (mouseenter)="activoHover.emit(i)"
            (mousedown)="$event.preventDefault(); elegido.emit(s)">
            <span class="avatar-sm">
              @if (s.avatarUrl) {
                <img [src]="s.avatarUrl" [alt]="'Foto de ' + s.nombre" />
              } @else {
                {{ s.iniciales }}
              }
            </span>
            <span class="datos">
              <strong>{{ s.nombre }}</strong>
              <small>&#64;{{ s.username }}</small>
            </span>
            <span class="relacion" [class.otro]="s.relacion === 'Sugerido'">{{ s.relacion }}</span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
      position: fixed;
      z-index: 9990;
    }

    .menciones {
      list-style: none;
      margin: 0;
      padding: 6px;
      background: var(--bg-card);
      border: 1px solid var(--bg-border);
      border-radius: 12px;
      box-shadow: 0 14px 34px -12px rgba(0, 0, 0, 0.7);
      max-height: 240px;
      overflow-y: auto;

      button {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        background: transparent;
        border: none;
        border-radius: 8px;
        padding: 7px 8px;
        cursor: pointer;
        text-align: left;
        color: var(--text-primary);
      }

      button.activa,
      button:hover {
        background: var(--bg-hover);
      }

      .avatar-sm {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 1px solid var(--bg-border);
        color: var(--text-primary);
        background: var(--bg-elevated);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.72rem;
        flex-shrink: 0;
        overflow: hidden;
      }

      .avatar-sm img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .datos {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
        min-width: 0;
        flex: 1;

        strong {
          font-size: 0.85rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        small {
          color: var(--text-muted);
          font-size: 0.75rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .relacion {
        font-size: 0.68rem;
        color: var(--accent-cyan);
        flex-shrink: 0;

        &.otro {
          color: var(--text-faint);
        }
      }
    }
  `,
})
export class MencionesPanelComponent {
  @Input() sugerencias: SugerenciaUsuario[] = [];
  @Input() activo = 0;
  @Output() elegido = new EventEmitter<SugerenciaUsuario>();
  @Output() activoHover = new EventEmitter<number>();
}

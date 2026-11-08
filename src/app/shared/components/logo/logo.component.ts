import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg
      class="logo__marca"
      viewBox="0 0 32 32"
      role="img"
      [attr.aria-label]="nombre ? null : 'N-soft'"
      [style.height.px]="alto"
      focusable="false"
    >
      <g fill="currentColor">
        <rect x="6" y="6" width="5" height="20" />
        <rect x="21" y="6" width="5" height="20" />
        <polygon points="6,6 11,6 26,26 21,26" />
      </g>
    </svg>
    @if (nombre) {
      <span class="logo__texto">N-soft</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5em;
      color: inherit;
    }

    .logo__marca {
      display: block;
      width: auto;
      flex-shrink: 0;
    }

    .logo__texto {
      font-weight: 700;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }
  `,
})
export class LogoComponent {
  @Input() alto = 26;
  @Input() nombre = false;
}

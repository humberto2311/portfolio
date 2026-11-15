
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg
      class="logo__marca"
      viewBox="0 0 35 32"
      role="img"
      [attr.aria-label]="nombre ? null : 'NFSocial'"
      [style.height.px]="alto"
      focusable="false"
    >
      <g fill="currentColor">
        <!-- N -->
        <path d="M1 7 H3.5 L9 20 V7 H11.5 V25 H9 L3.5 12 V25 H1 Z" />

        <!-- F -->
        <path d="M13 7 H21 V9.5 H15.5 V14.5 H20 V17 H15.5 V25 H13 Z" />

        <!-- S -->
        <path
          d="
            M31 8.5
            H25
            C23.6 8.5 23 9.3 23 10.7
            V12.3
            C23 13.7 23.8 14.5 25.2 14.5
            H29.8
            C31.2 14.5 32 15.3 32 16.7
            V21.3
            C32 22.7 31.2 23.5 29.8 23.5
            H23
          "
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

      </g>
    </svg>

    @if (nombre) {
      <span class="logo__texto">ocial</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.01em;
      color: inherit;
    }

    .logo__marca {
      display: block;
      width: auto;
      flex-shrink: 0;
    }

    .logo__texto {
      font-weight: 820;
      letter-spacing: -0.02em;
      white-space: nowrap;
      font-size: 20px;
      margin-top: 0.4em;
    }
  `,
})
export class LogoComponent {
  @Input() alto = 26;
  @Input() nombre = false;
}

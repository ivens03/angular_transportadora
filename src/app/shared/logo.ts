import { Component, input } from '@angular/core';

/** Marca RotaCerta: uma rota sinuosa que termina num ponto verde (entregue). */
@Component({
  selector: 'app-logo',
  template: `
    <span class="logo" [class.compacto]="compacto()">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#2d3277"/>
        <path d="M14 42c8 0 10-20 20-20s10 12 16 12" fill="none" stroke="#ffe600" stroke-width="6" stroke-linecap="round"/>
        <circle cx="14" cy="42" r="5" fill="#ffe600"/>
        <circle cx="50" cy="34" r="6" fill="#00a650" stroke="#fff" stroke-width="2"/>
      </svg>
      @if (!compacto()) { <span class="nome">Rota<b>Certa</b></span> }
    </span>`,
  styles: `
    .logo { display: inline-flex; align-items: center; gap: 8px; color: var(--rc-marinho); }
    svg { width: 34px; height: 34px; }
    .nome { font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
    .nome b { font-weight: 800; }
  `,
})
export class Logo {
  readonly compacto = input(false);
}

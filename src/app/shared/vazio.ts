import { Component, input } from '@angular/core';

/** Estado vazio: ícone grande, título, explicação e (opcional) uma ação via <ng-content>. */
@Component({
  selector: 'app-vazio',
  template: `
    <div class="vazio">
      <span class="icone" aria-hidden="true">{{ icone() }}</span>
      <h3>{{ titulo() }}</h3>
      @if (texto()) { <p class="texto-2">{{ texto() }}</p> }
      <ng-content />
    </div>`,
  styles: `
    .vazio { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 40px 16px; }
    .vazio > .icone { font-size: 56px; color: var(--rc-texto-3); margin-bottom: 4px; }
    .vazio h3 { font-size: 18px; }
    .vazio p { max-width: 360px; font-size: 14px; margin-bottom: 8px; }
  `,
})
export class Vazio {
  readonly icone = input('inventory_2');
  readonly titulo = input.required<string>();
  readonly texto = input<string>();
}

import { Component, input } from '@angular/core';

/** Placeholder enquanto a lista carrega (evita "pulo" de layout). */
@Component({
  selector: 'app-carregando',
  template: `
    <div class="card sem-padding">
      @for (i of linhas(); track i) {
        <div class="linha" style="padding:14px 16px; gap:12px">
          <div class="esqueleto" style="width:44px;height:44px;border-radius:50%"></div>
          <div class="cresce pilha" style="gap:6px">
            <div class="esqueleto" style="height:14px;width:60%"></div>
            <div class="esqueleto" style="height:12px;width:35%"></div>
          </div>
        </div>
      }
    </div>`,
})
export class Carregando {
  readonly quantidade = input(4);
  protected linhas() { return Array.from({ length: this.quantidade() }, (_, i) => i); }
}

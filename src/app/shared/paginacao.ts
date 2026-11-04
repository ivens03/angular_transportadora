import { Component, computed, input, output } from '@angular/core';
import { Pagina } from '../core/modelos';

@Component({
  selector: 'app-paginacao',
  template: `
    @if (info(); as p) {
      @if (p.totalPages > 1) {
        <nav class="paginacao" aria-label="Paginação">
          <button class="btn btn-texto" [disabled]="p.number === 0" (click)="ir.emit(p.number - 1)">
            <span class="icone" aria-hidden="true">chevron_left</span> Anterior
          </button>
          <span class="pequeno texto-2">Página {{ p.number + 1 }} de {{ p.totalPages }}</span>
          <button class="btn btn-texto" [disabled]="p.number + 1 >= p.totalPages" (click)="ir.emit(p.number + 1)">
            Próxima <span class="icone" aria-hidden="true">chevron_right</span>
          </button>
        </nav>
      }
    }`,
  styles: `.paginacao { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; }`,
})
export class Paginacao {
  readonly pagina = input<Pagina<unknown> | null>(null);
  readonly ir = output<number>();
  protected readonly info = computed(() => this.pagina()?.page ?? null);
}

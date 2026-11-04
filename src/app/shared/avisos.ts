import { Component, inject } from '@angular/core';
import { AvisoService } from '../core/aviso.service';

@Component({
  selector: 'app-avisos',
  template: `
    <div class="pilha-avisos" aria-live="polite">
      @for (a of servico.avisos(); track a.id) {
        <div class="snack {{ a.tipo }}" role="status">
          <span class="icone">{{ a.tipo === 'sucesso' ? 'check_circle' : a.tipo === 'erro' ? 'error' : 'info' }}</span>
          <span class="cresce">{{ a.texto }}</span>
          <button class="btn btn-icone" (click)="servico.fechar(a.id)" aria-label="Fechar"><span class="icone">close</span></button>
        </div>
      }
    </div>`,
  styles: `
    .pilha-avisos { position: fixed; z-index: 2000; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom) + var(--rc-desloc-aviso, 0px));
      display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
    .snack { pointer-events: auto; display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 14px; border-radius: 8px;
      background: #333; color: #fff; box-shadow: var(--rc-sombra-alta); font-size: 14px; animation: entra .2s ease; }
    .snack.sucesso > .icone:first-child { color: #4cd38a; }
    .snack.erro > .icone:first-child { color: #ff7b87; }
    .snack .btn-icone { color: #fff; }
    @media (min-width: 768px) { .pilha-avisos { left: auto; right: 24px; bottom: 24px; width: 400px; } }
    @keyframes entra { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
  `,
})
export class Avisos {
  protected readonly servico = inject(AvisoService);
}

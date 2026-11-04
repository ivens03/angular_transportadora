import { Component, effect, input, model } from '@angular/core';

/**
 * "Bottom sheet": no celular sobe do rodapé; no desktop vira um diálogo central.
 * Uso: <app-folha [(aberta)]="mostrar" titulo="..."> conteúdo </app-folha>
 */
@Component({
  selector: 'app-folha',
  template: `
    @if (aberta()) {
      <div class="fundo" (click)="aberta.set(false)"></div>
      <section class="folha" role="dialog" aria-modal="true" [attr.aria-label]="titulo()">
        <div class="pegador" aria-hidden="true"></div>
        <header class="linha-entre">
          <h2>{{ titulo() }}</h2>
          <button class="btn btn-icone" type="button" (click)="aberta.set(false)" aria-label="Fechar">
            <span class="icone">close</span>
          </button>
        </header>
        <div class="corpo"><ng-content /></div>
      </section>
    }`,
  styles: `
    .fundo { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; animation: aparece .15s ease; }
    .folha {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 1001;
      max-height: 90dvh; overflow: auto;
      background: #fff; border-radius: 16px 16px 0 0;
      padding: 8px 16px calc(16px + env(safe-area-inset-bottom));
      animation: sobe .2s ease;
    }
    .pegador { width: 40px; height: 4px; border-radius: 2px; background: rgba(0,0,0,.2); margin: 0 auto 8px; }
    header h2 { font-size: 18px; }
    .corpo { padding-top: 8px; }
    @media (min-width: 768px) {
      .folha { left: 50%; right: auto; bottom: auto; top: 50%; transform: translate(-50%, -50%); width: 520px; border-radius: 12px; padding: 16px 24px 24px; animation: aparece .15s ease; }
      .pegador { display: none; }
    }
    @keyframes sobe { from { transform: translateY(100%); } to { transform: none; } }
    @keyframes aparece { from { opacity: 0; } to { opacity: 1; } }
  `,
  host: { '(document:keydown.escape)': 'aberta.set(false)' },
})
export class Folha {
  readonly aberta = model(false);
  readonly titulo = input('');

  constructor() {
    // trava a rolagem da página por trás da folha
    effect(() => { document.body.style.overflow = this.aberta() ? 'hidden' : ''; });
  }
}

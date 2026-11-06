import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SessaoService } from '../core/auth/sessao.service';
import { Logo } from '../shared/logo';

/** Casca do Portal do Cliente: cabeçalho amarelo com o nome e o botão de sair; conteúdo centralizado. */
@Component({
  selector: 'app-cliente-layout',
  imports: [RouterOutlet, RouterLink, Logo],
  template: `
    <header class="topo">
      <a routerLink="/cliente" aria-label="Minhas encomendas"><app-logo /></a>
      <div class="usuario">
        <span class="nome truncar">{{ sessao.primeiroNome() }}</span>
        <button type="button" class="btn btn-texto btn-pequeno" (click)="sessao.sair()"><span class="icone">logout</span> Sair</button>
      </div>
    </header>
    <main><router-outlet /></main>`,
  styles: `
    :host { display: block; min-height: 100dvh; }
    .topo { position: sticky; top: 0; z-index: 900; background: var(--rc-amarelo); display: flex; align-items: center; justify-content: space-between; gap: 12px;
      height: var(--rc-cabecalho); padding: 0 var(--rc-gutter); box-shadow: 0 1px 0 rgba(0,0,0,.1); }
    .topo a { text-decoration: none; }
    .usuario { display: flex; align-items: center; gap: 4px; min-width: 0; }
    .nome { font-weight: 600; font-size: 14px; max-width: 40vw; }
    .usuario .btn { color: var(--rc-texto); }
    main { max-width: 960px; margin: 0 auto; }
  `,
})
export class ClienteLayout {
  protected readonly sessao = inject(SessaoService);
}

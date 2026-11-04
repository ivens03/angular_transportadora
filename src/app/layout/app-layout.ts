import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessaoService } from '../core/auth/sessao.service';
import { Rastreador } from '../features/entregador/rastreador.service';
import { Logo } from '../shared/logo';

/** Casca do app do entregador: cabeçalho amarelo compacto + navegação inferior (polegar). */
@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo],
  template: `
    <header class="topo">
      <a routerLink="/app/rotas" aria-label="Minhas rotas"><app-logo /></a>
      @if (rastreador.ativo()) {
        <span class="gps" [class.erro]="rastreador.erro()" [title]="rastreador.erro() ?? 'Enviando sua localização'">
          <span class="ponto"></span>{{ rastreador.erro() ? 'GPS com problema' : 'GPS ligado' }}
        </span>
      }
    </header>

    @if (sessao.diasParaVencer(); as dias) {
      @if (dias <= 5) {
        <a class="faixa" routerLink="/app/conta"><span class="icone">key</span> Seu PIN vence em {{ dias }} dia(s). Trocar</a>
      }
    }

    <main><router-outlet /></main>

    <nav class="inferior" aria-label="Navegação">
      <a routerLink="/app/rotas" routerLinkActive="ativo" class="item-nav">
        <span class="icone">route</span><span>Rotas</span>
      </a>
      <a routerLink="/app/conta" routerLinkActive="ativo" class="item-nav">
        <span class="icone">person</span><span>Conta</span>
      </a>
    </nav>`,
  styles: `
    :host { display: block; padding-bottom: calc(var(--rc-nav-inferior) + env(safe-area-inset-bottom)); --rc-desloc-aviso: var(--rc-nav-inferior); }
    .topo { position: sticky; top: 0; z-index: 900; background: var(--rc-amarelo); display: flex; align-items: center; justify-content: space-between;
      height: var(--rc-cabecalho); padding: 0 var(--rc-gutter); box-shadow: 0 1px 0 rgba(0,0,0,.1); }
    .topo a { text-decoration: none; }
    .gps { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #00703a; background: rgba(255,255,255,.7); padding: 4px 10px; border-radius: 14px; }
    .gps .ponto { width: 8px; height: 8px; border-radius: 50%; background: var(--rc-verde); animation: pulsa 1.5s ease-in-out infinite; }
    .gps.erro { color: var(--rc-vermelho); }
    .gps.erro .ponto { background: var(--rc-vermelho); }
    .faixa { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; font-size: 14px; background: var(--rc-laranja-suave); color: #8a4100; }
    .faixa .icone { font-size: 18px; }
    .inferior { position: fixed; left: 0; right: 0; bottom: 0; z-index: 900; display: flex; background: #fff;
      height: calc(var(--rc-nav-inferior) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); box-shadow: 0 -1px 4px rgba(0,0,0,.1); }
    .item-nav { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 12px; color: var(--rc-texto-2); text-decoration: none !important; }
    .item-nav.ativo { color: var(--rc-azul); font-weight: 700; }
    .item-nav.ativo .icone { font-variation-settings: 'FILL' 1; }
    @keyframes pulsa { 50% { opacity: .3; } }
    @media (min-width: 768px) {
      main { max-width: 720px; margin: 0 auto; }
    }
  `,
})
export class AppLayout {
  protected readonly sessao = inject(SessaoService);
  protected readonly rastreador = inject(Rastreador);
}

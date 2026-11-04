import { DecimalPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RotasApi } from '../../core/api/rotas.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { erroApi } from '../../core/erro';
import { RotaResumo } from '../../core/modelos';
import { Carregando } from '../../shared/carregando';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Vazio } from '../../shared/vazio';

/** Lista do entregador: a rota ativa em destaque, depois as planejadas e o histórico. */
@Component({
  selector: 'app-minhas-rotas',
  imports: [RouterLink, DecimalPipe, DatePipe, EtiquetaStatus, Vazio, Carregando],
  template: `
    <div class="conteudo pilha-g">
      <div>
        <h1 style="font-size:22px">Olá, {{ sessao.primeiroNome() }}!</h1>
        <p class="texto-2 pequeno">{{ hoje | date: "EEEE, d 'de' MMMM" }}</p>
      </div>

      @if (carregando()) {
        <app-carregando [quantidade]="3" />
      } @else if (erro()) {
        <div class="aviso erro"><span class="icone">wifi_off</span><span class="cresce">{{ erro() }}</span>
          <button class="btn btn-texto btn-pequeno" (click)="carregar()">Tentar de novo</button></div>
      } @else {
        @if (emAndamento(); as r) {
          <a class="card destaque" [routerLink]="['/app/rotas', r.id]">
            <div class="linha-entre"><span class="etiqueta azul"><span class="icone" style="font-size:14px">local_shipping</span> Em andamento</span>
              <span class="pequeno texto-2">{{ r.codigo }}</span></div>
            <div class="numeros">
              <div class="kpi"><span class="valor">{{ r.paradasBaixadas }}<small>/ {{ r.totalParadas }}</small></span><span class="rotulo">entregas feitas</span></div>
              <div class="kpi"><span class="valor">{{ r.distanciaEstimadaKm | number: '1.0-1' }}<small>km</small></span><span class="rotulo">na rota</span></div>
            </div>
            <div class="barra-progresso"><span [style.width.%]="r.totalParadas ? r.paradasBaixadas * 100 / r.totalParadas : 0"></span></div>
            <span class="btn btn-primario btn-bloco">Continuar rota <span class="icone">arrow_forward</span></span>
          </a>
        }

        @if (planejadas().length) {
          <section>
            <h2 class="secao-titulo">Para fazer</h2>
            <ul class="lista card sem-padding">
              @for (r of planejadas(); track r.id) {
                <li><a class="item" [routerLink]="['/app/rotas', r.id]">
                  <span class="item-icone"><span class="icone">route</span></span>
                  <span class="cresce">
                    <span class="item-titulo">{{ r.totalParadas }} entrega{{ r.totalParadas === 1 ? '' : 's' }} · {{ r.distanciaEstimadaKm | number: '1.0-1' }} km</span>
                    <span class="item-sub" style="display:block">{{ r.codigo }} · {{ r.veiculoPlaca }} · ~{{ r.duracaoEstimadaMin }} min</span>
                  </span>
                  <span class="icone seta">chevron_right</span>
                </a></li>
              }
            </ul>
          </section>
        }

        @if (!emAndamento() && !planejadas().length) {
          <div class="card"><app-vazio icone="beach_access" titulo="Nenhuma rota para você agora"
            texto="Quando o Suporte montar uma rota no seu nome, ela aparece aqui." >
            <button class="btn btn-secundario" (click)="carregar()"><span class="icone">refresh</span> Atualizar</button>
          </app-vazio></div>
        }

        @if (historico().length) {
          <section>
            <h2 class="secao-titulo">Histórico</h2>
            <ul class="lista card sem-padding">
              @for (r of historico(); track r.id) {
                <li><a class="item" [routerLink]="['/app/rotas', r.id]">
                  <span class="cresce">
                    <span class="item-titulo">{{ r.codigo }}</span>
                    <span class="item-sub" style="display:block">{{ (r.concluidaEm ?? r.criadaEm) | date: 'dd/MM HH:mm' }} · {{ r.paradasBaixadas }}/{{ r.totalParadas }} paradas</span>
                  </span>
                  <app-status tipo="rota" [valor]="r.status" />
                </a></li>
              }
            </ul>
          </section>
        }
      }
    </div>`,
  styles: `
    .destaque { display: flex; flex-direction: column; gap: 14px; color: inherit; text-decoration: none !important; border-top: 4px solid var(--rc-azul); }
    .numeros { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  `,
})
export class MinhasRotas {
  private readonly api = inject(RotasApi);
  protected readonly sessao = inject(SessaoService);
  protected readonly hoje = new Date();

  protected readonly rotas = signal<RotaResumo[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly emAndamento = computed(() => this.rotas().find(r => r.status === 'EM_ANDAMENTO') ?? null);
  protected readonly planejadas = computed(() => this.rotas().filter(r => r.status === 'PLANEJADA'));
  protected readonly historico = computed(() => this.rotas().filter(r => r.status === 'CONCLUIDA' || r.status === 'CANCELADA').slice(0, 10));

  constructor() { this.carregar(); }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.listar({ size: 50, sort: 'criadaEm,desc' }).subscribe({
      next: p => { this.rotas.set(p.content); this.carregando.set(false); },
      error: e => { this.erro.set(erroApi(e).mensagem); this.carregando.set(false); },
    });
  }
}

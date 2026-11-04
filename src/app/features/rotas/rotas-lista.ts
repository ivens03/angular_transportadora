import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RotasApi } from '../../core/api/rotas.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { erroApi } from '../../core/erro';
import { Pagina, Permissao, RotaResumo, StatusRota } from '../../core/modelos';
import { ROTULOS } from '../../core/rotulos';
import { Carregando } from '../../shared/carregando';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Paginacao } from '../../shared/paginacao';
import { Vazio } from '../../shared/vazio';

@Component({
  selector: 'app-rotas-lista',
  imports: [RouterLink, DatePipe, DecimalPipe, EtiquetaStatus, Paginacao, Vazio, Carregando],
  template: `
    <div class="conteudo">
      <div class="cabecalho-pagina">
        <div><h1>Rotas</h1><p>Planejadas, na rua e o histórico.</p></div>
        @if (podeMontar) {
          <div class="acoes"><a class="btn btn-primario" routerLink="/painel/rotas/nova"><span class="icone">add_road</span> Montar rota</a></div>
        }
      </div>

      <div class="chips" role="toolbar" aria-label="Filtrar por status">
        <button class="chip" [class.ativo]="!status()" (click)="filtrar(null)">Todas</button>
        @for (s of statusLista; track s) {
          <button class="chip" [class.ativo]="status() === s" (click)="filtrar(s)">{{ rotulos[s].texto }}</button>
        }
      </div>

      @if (erro()) {
        <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div>
      } @else if (!pagina()) {
        <app-carregando />
      } @else if (!pagina()!.content.length) {
        <div class="card"><app-vazio icone="alt_route" titulo="Nenhuma rota" texto="Monte uma rota escolhendo as cargas que aguardam entrega.">
          @if (podeMontar) { <a class="btn btn-primario" routerLink="/painel/rotas/nova">Montar rota</a> }
        </app-vazio></div>
      } @else {
        <ul class="lista card sem-padding">
          @for (r of pagina()!.content; track r.id) {
            <li><a class="item" [routerLink]="['/painel/rotas', r.id]">
              <span class="item-icone" [class.na-rua]="r.status === 'EM_ANDAMENTO'"><span class="icone">{{ r.status === 'EM_ANDAMENTO' ? 'local_shipping' : 'route' }}</span></span>
              <span class="cresce">
                <span class="linha"><span class="item-titulo truncar">{{ r.entregadorNome }}</span><app-status tipo="rota" [valor]="r.status" /></span>
                <span class="item-sub" style="display:block">{{ r.codigo }} · {{ r.veiculoPlaca }} · {{ r.distanciaEstimadaKm | number: '1.0-1' }} km · ~{{ r.duracaoEstimadaMin }} min</span>
                <span class="linha" style="margin-top:6px">
                  <span class="barra-progresso cresce"><span [style.width.%]="r.totalParadas ? r.paradasBaixadas * 100 / r.totalParadas : 0"></span></span>
                  <span class="mini texto-2 nowrap">{{ r.paradasBaixadas }}/{{ r.totalParadas }}</span>
                </span>
              </span>
              <span class="mini texto-3 so-desktop nowrap">{{ (r.iniciadaEm ?? r.criadaEm) | date: 'dd/MM HH:mm' }}</span>
              <span class="icone seta">chevron_right</span>
            </a></li>
          }
        </ul>
        <app-paginacao [pagina]="pagina()" (ir)="irPara($event)" />
      }
    </div>`,
  styles: `.na-rua { background: var(--rc-azul-suave); color: var(--rc-azul); }`,
})
export class RotasLista {
  private readonly api = inject(RotasApi);
  private readonly router = inject(Router);
  protected readonly podeMontar = inject(SessaoService).tem(Permissao.ENTREGA_CADASTRAR);

  readonly status = input<StatusRota | undefined>();
  readonly page = input<string>();

  protected readonly statusLista: StatusRota[] = ['EM_ANDAMENTO', 'PLANEJADA', 'CONCLUIDA', 'CANCELADA'];
  protected readonly rotulos = ROTULOS['rota'];
  protected readonly pagina = signal<Pagina<RotaResumo> | null>(null);
  protected readonly erro = signal<string | null>(null);

  constructor() {
    effect(() => {
      const status = this.status() ?? null;
      const page = Number(this.page() ?? 0);
      untracked(() => {
        this.pagina.set(null);
        this.api.listar({ status, page, size: 20 }).subscribe({
          next: p => this.pagina.set(p),
          error: e => this.erro.set(erroApi(e).mensagem),
        });
      });
    });
  }

  protected filtrar(status: StatusRota | null) { this.router.navigate([], { queryParams: { status } }); }
  protected irPara(page: number) { this.router.navigate([], { queryParams: { status: this.status() ?? null, page: page || null } }); }
}

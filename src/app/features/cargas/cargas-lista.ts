import { DecimalPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CargasApi } from '../../core/api/cargas.api';
import { erroApi } from '../../core/erro';
import { Carga, Pagina, StatusCarga } from '../../core/modelos';
import { ROTULOS } from '../../core/rotulos';
import { Carregando } from '../../shared/carregando';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Paginacao } from '../../shared/paginacao';
import { Vazio } from '../../shared/vazio';

/** Lista de cargas. Os filtros moram na URL (?status=&bairro=&cidade=&page=), então dá para compartilhar o link. */
@Component({
  selector: 'app-cargas-lista',
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe, EtiquetaStatus, Paginacao, Vazio, Carregando],
  template: `
    <div class="conteudo">
      <div class="cabecalho-pagina">
        <div>
          <h1>Cargas</h1>
          <p>@if (pagina(); as p) { {{ p.page.totalElements }} resultado(s) } @else { Carregando… }</p>
        </div>
        <div class="acoes">
          <a class="btn btn-secundario" routerLink="/painel/rotas/nova"><span class="icone">add_road</span> Montar rota</a>
          <a class="btn btn-primario" routerLink="/painel/cargas/nova"><span class="icone">add</span> Nova entrega</a>
        </div>
      </div>

      <div class="chips" role="toolbar" aria-label="Filtrar por status">
        <button class="chip" [class.ativo]="!status()" (click)="filtrar({ status: null })">Todas</button>
        @for (s of statusLista; track s) {
          <button class="chip" [class.ativo]="status() === s" (click)="filtrar({ status: s })">{{ rotulos[s].texto }}</button>
        }
      </div>

      <form class="filtros" (ngSubmit)="filtrar({ bairro: bairroDigitado, cidade: cidadeDigitada })">
        <input class="entrada" name="bairro" [(ngModel)]="bairroDigitado" placeholder="Bairro" aria-label="Bairro">
        <input class="entrada" name="cidade" [(ngModel)]="cidadeDigitada" placeholder="Cidade" aria-label="Cidade">
        <button class="btn btn-secundario" type="submit"><span class="icone">filter_list</span> Filtrar</button>
      </form>

      @if (erro()) {
        <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div>
      } @else if (!pagina()) {
        <app-carregando />
      } @else if (pagina()!.content.length === 0) {
        <div class="card"><app-vazio icone="inventory_2" titulo="Nenhuma carga por aqui"
          texto="Mude os filtros ou cadastre uma nova entrega."><a class="btn btn-primario" routerLink="/painel/cargas/nova">Nova entrega</a></app-vazio></div>
      } @else {
        <ul class="lista card sem-padding">
          @for (c of pagina()!.content; track c.id) {
            <li><a class="item" [routerLink]="['/painel/cargas', c.id]">
              <span class="item-icone quadrado"><span class="icone">package_2</span></span>
              <span class="cresce">
                <span class="item-titulo truncar" style="display:block">{{ c.descricao }}</span>
                <span class="item-sub" style="display:block">{{ c.destinatarioNome }} · {{ c.bairro }}, {{ c.cidade }}</span>
                <span class="linha" style="margin-top:4px">
                  <app-status tipo="carga" [valor]="c.status" />
                  @if (c.clienteNome) { <span class="etiqueta azul"><span class="icone" style="font-size:14px">storefront</span> {{ c.clienteNome }}</span> }
                  @if (c.tentativasEntrega > 0) { <span class="etiqueta laranja">{{ c.tentativasEntrega }}ª tentativa</span> }
                  <span class="mini texto-3">{{ c.codigo }}</span>
                </span>
              </span>
              <span class="direita">
                <span class="item-destaque">{{ c.pesoKg | number: '1.0-1' }} <small>kg</small></span>
                <span class="mini texto-3 so-desktop">{{ c.criadaEm | date: 'dd/MM HH:mm' }}</span>
              </span>
            </a></li>
          }
        </ul>
        <app-paginacao [pagina]="pagina()" (ir)="filtrar({ page: $event })" />
      }
    </div>`,
  styles: `
    .filtros { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; margin: 8px 0 16px; }
    .filtros .entrada { min-height: 44px; }
    .filtros .btn { min-height: 44px; padding: 0 12px; }
    @media (max-width: 480px) { .filtros { grid-template-columns: 1fr 1fr; } .filtros .btn { grid-column: 1 / -1; } }
    .quadrado { border-radius: 8px; background: #fff6b3; color: #6b5d00; }
    .direita { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .item-destaque small { font-size: 13px; font-weight: 400; color: var(--rc-texto-2); }
  `,
})
export class CargasLista {
  private readonly api = inject(CargasApi);
  private readonly router = inject(Router);

  // query params → inputs (withComponentInputBinding)
  readonly status = input<StatusCarga | undefined>();
  readonly bairro = input<string>();
  readonly cidade = input<string>();
  readonly page = input<string>();

  protected readonly statusLista: StatusCarga[] = ['AGUARDANDO_ROTA', 'ROTEIRIZADA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA'];
  protected readonly rotulos = ROTULOS['carga'];
  protected readonly pagina = signal<Pagina<Carga> | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected bairroDigitado = '';
  protected cidadeDigitada = '';

  constructor() {
    effect(() => {
      const f = { status: this.status() ?? null, bairro: this.bairro() ?? null, cidade: this.cidade() ?? null, page: Number(this.page() ?? 0) };
      untracked(() => {
        this.bairroDigitado = f.bairro ?? '';
        this.cidadeDigitada = f.cidade ?? '';
        this.pagina.set(null);
        this.erro.set(null);
        this.api.listar({ ...f, size: 20, sort: 'criadaEm,desc' }).subscribe({
          next: p => this.pagina.set(p),
          error: e => this.erro.set(erroApi(e).mensagem),
        });
      });
    });
  }

  protected filtrar(mudanca: Record<string, string | number | null>): void {
    const q = { status: this.status() ?? null, bairro: this.bairro() ?? null, cidade: this.cidade() ?? null, page: null as number | null, ...mudanca };
    for (const k of Object.keys(q) as (keyof typeof q)[]) if (q[k] === '' || q[k] === 0) q[k] = null;
    this.router.navigate([], { queryParams: q });
  }
}

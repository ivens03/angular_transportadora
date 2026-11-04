import { DecimalPipe } from '@angular/common';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { VeiculosApi } from '../../core/api/veiculos.api';
import { erroApi } from '../../core/erro';
import { Pagina, StatusVeiculo, TipoVeiculo, Veiculo } from '../../core/modelos';
import { ROTULOS, TIPOS_VEICULO } from '../../core/rotulos';
import { Carregando } from '../../shared/carregando';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Paginacao } from '../../shared/paginacao';
import { Vazio } from '../../shared/vazio';

@Component({
  selector: 'app-veiculos-lista',
  imports: [RouterLink, DecimalPipe, EtiquetaStatus, Paginacao, Vazio, Carregando],
  template: `
    <div class="conteudo">
      <div class="cabecalho-pagina">
        <div><h1>Frota</h1><p>@if (pagina(); as p) { {{ p.page.totalElements }} veículo(s) } @else { Carregando… }</p></div>
        <div class="acoes"><a class="btn btn-primario" routerLink="/painel/veiculos/novo"><span class="icone">add</span> Novo veículo</a></div>
      </div>

      <div class="chips" aria-label="Status">
        <button class="chip" [class.ativo]="!status()" (click)="filtrar({ status: null })">Todos</button>
        @for (s of statusLista; track s) {
          <button class="chip" [class.ativo]="status() === s" (click)="filtrar({ status: s })">{{ rotulosStatus[s].texto }}</button>
        }
      </div>
      <div class="chips" aria-label="Tipo" style="margin-bottom:12px">
        @for (t of tiposLista; track t) {
          <button class="chip" [class.ativo]="tipo() === t" (click)="filtrar({ tipo: tipo() === t ? null : t })">
            <span class="icone" style="font-size:18px">{{ tipos[t].icone }}</span>{{ tipos[t].texto }}
          </button>
        }
      </div>

      @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
      @else if (!pagina()) { <app-carregando /> }
      @else if (!pagina()!.content.length) {
        <div class="card"><app-vazio icone="local_shipping" titulo="Nenhum veículo encontrado" texto="Cadastre a frota para montar rotas.">
          <a class="btn btn-primario" routerLink="/painel/veiculos/novo">Novo veículo</a></app-vazio></div>
      } @else {
        <div class="grade md-2 lg-3">
          @for (v of pagina()!.content; track v.id) {
            <a class="card veiculo" [routerLink]="['/painel/veiculos', v.id]">
              <div class="linha-entre">
                <span class="placa">{{ v.placa }}</span>
                <app-status tipo="veiculo" [valor]="v.status" />
              </div>
              <div class="linha" style="gap:12px">
                <span class="item-icone"><span class="icone">{{ tipos[v.tipo].icone }}</span></span>
                <div class="cresce">
                  <div class="item-titulo truncar">{{ v.marca }} {{ v.modelo }}</div>
                  <div class="item-sub">{{ tipos[v.tipo].texto }} · {{ v.anoFabricacao }} · {{ v.quilometragemAtual ?? 0 | number }} km</div>
                </div>
              </div>
              <div class="capacidades pequeno texto-2">
                <span><span class="icone">weight</span>{{ v.capacidadeCargaKg | number: '1.0-0' }} kg</span>
                <span><span class="icone">deployed_code</span>{{ v.capacidadeVolumeM3 | number: '1.0-2' }} m³</span>
                @if (v.consumoReferenciaKmPorLitro) { <span><span class="icone">local_gas_station</span>{{ v.consumoReferenciaKmPorLitro | number: '1.0-1' }} km/l</span> }
              </div>
            </a>
          }
        </div>
        <app-paginacao [pagina]="pagina()" (ir)="filtrar({ page: $event })" />
      }
    </div>`,
  styles: `
    .veiculo { display: flex; flex-direction: column; gap: 12px; color: inherit; text-decoration: none !important; }
    .veiculo:hover { box-shadow: var(--rc-sombra-alta); }
    .placa { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-weight: 700; letter-spacing: 1px; padding: 2px 8px; border: 2px solid #1d1d1d; border-radius: 4px; background: #fff; border-top-width: 6px; border-top-color: #2d5bb9; font-size: 14px; }
    .capacidades { display: flex; gap: 14px; flex-wrap: wrap; }
    .capacidades .icone { font-size: 16px; vertical-align: -3px; margin-right: 2px; }
  `,
})
export class VeiculosLista {
  private readonly api = inject(VeiculosApi);
  private readonly router = inject(Router);

  readonly status = input<StatusVeiculo | undefined>();
  readonly tipo = input<TipoVeiculo | undefined>();
  readonly page = input<string>();

  protected readonly statusLista: StatusVeiculo[] = ['ATIVO', 'EM_MANUTENCAO', 'INATIVO'];
  protected readonly tiposLista = Object.keys(TIPOS_VEICULO) as TipoVeiculo[];
  protected readonly rotulosStatus = ROTULOS['veiculo'];
  protected readonly tipos = TIPOS_VEICULO;
  protected readonly pagina = signal<Pagina<Veiculo> | null>(null);
  protected readonly erro = signal<string | null>(null);

  constructor() {
    effect(() => {
      const f = { status: this.status() ?? null, tipo: this.tipo() ?? null, page: Number(this.page() ?? 0) };
      untracked(() => {
        this.pagina.set(null);
        this.api.listar({ ...f, size: 24, sort: 'placa,asc' }).subscribe({
          next: p => this.pagina.set(p), error: e => this.erro.set(erroApi(e).mensagem),
        });
      });
    });
  }

  protected filtrar(m: Record<string, string | number | null>) {
    this.router.navigate([], { queryParams: { status: this.status() ?? null, tipo: this.tipo() ?? null, page: null, ...m } });
  }
}

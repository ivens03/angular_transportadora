import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EncomendasApi } from '../../core/api/encomendas.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { duracao, fila, ondeEsta, separar } from '../../core/encomenda';
import { erroApi } from '../../core/erro';
import { Encomenda, EncomendaResumo } from '../../core/modelos';
import { Carregando } from '../../shared/carregando';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Vazio } from '../../shared/vazio';

/**
 * Início do Portal do Cliente, em três blocos:
 *  1. "A caminho agora": cada encomenda EM_TRANSITO com a rua do entregador e quanto falta (atualiza sozinho)
 *  2. "Vão ser entregues": separadas numa rota ou ainda preparando
 *  3. "Já entregues"
 * A lista vem de GET /encomendas; o "a caminho" busca o detalhe (GET /encomendas/{codigo}) de cada uma.
 */
@Component({
  selector: 'app-minhas-encomendas',
  imports: [RouterLink, DatePipe, DecimalPipe, EtiquetaStatus, Vazio, Carregando],
  template: `
    <div class="conteudo pilha-g">
      <div class="linha-entre">
        <div>
          <h1 style="font-size:22px">Olá, {{ sessao.primeiroNome() }}!</h1>
          <p class="texto-2 pequeno">Suas encomendas · atualiza sozinho</p>
        </div>
        <button class="btn btn-icone" (click)="carregar()" aria-label="Atualizar"><span class="icone" [class.girando]="atualizando()">refresh</span></button>
      </div>

      @if (carregando()) {
        <app-carregando [quantidade]="3" />
      } @else if (erro() && !lista().length) {
        <div class="aviso erro"><span class="icone">wifi_off</span><span class="cresce">{{ erro() }}</span>
          <button class="btn btn-texto btn-pequeno" (click)="carregar()">Tentar de novo</button></div>
      } @else if (!lista().length) {
        <div class="card"><app-vazio icone="inventory_2" titulo="Nenhuma encomenda ainda"
          texto="Quando a transportadora receber uma encomenda sua, ela aparece aqui." /></div>
      } @else {
        @if (grupos().aCaminho.length) {
          <section class="pilha">
            <h2 class="secao-titulo"><span class="ao-vivo"><span class="ponto"></span></span> A caminho agora</h2>
            @for (e of grupos().aCaminho; track e.codigo) {
              <a class="card a-caminho" [routerLink]="['/cliente/encomendas', e.codigo]">
                <div class="linha-entre"><span class="forte">{{ e.descricao }}</span><span class="mini texto-2 mono">{{ e.codigo }}</span></div>
                @if (detalhes()[e.codigo]?.rastreio; as r) {
                  @if (r.previsaoMinutos !== null) {
                    <div class="chegada">
                      <span class="icone">schedule</span>
                      <span>Chega em <b>~{{ duracao(r.previsaoMinutos) }}</b>
                        @if (r.previsaoChegadaEm) { <span class="texto-2">&nbsp;(por volta das {{ r.previsaoChegadaEm | date: 'HH:mm' }})</span> }</span>
                    </div>
                  }
                  @if (ondeEsta(r); as onde) { <div class="onde"><span class="icone">location_on</span>{{ onde }}</div> }
                  <div class="pequeno texto-2">
                    {{ r.entregador }} · {{ r.veiculoModelo }} {{ r.veiculoPlaca }}
                    @if (r.distanciaKm !== null) { · {{ r.distanciaKm | number: '1.0-1' }} km }
                  </div>
                  @if (fila(r); as f) { <span class="etiqueta {{ r.entregasAntes === 0 ? 'verde' : 'azul' }}">{{ f }}</span> }
                } @else {
                  <div class="pequeno texto-2">Para {{ e.destinatarioNome }} · {{ e.bairro }}</div>
                }
                <span class="btn btn-primario btn-bloco"><span class="icone">map</span> Ver o entregador no mapa</span>
              </a>
            }
          </section>
        }

        <section>
          <h2 class="secao-titulo">Vão ser entregues @if (grupos().vaoSerEntregues.length) { ({{ grupos().vaoSerEntregues.length }}) }</h2>
          @if (grupos().vaoSerEntregues.length) {
            <ul class="lista card sem-padding">
              @for (e of grupos().vaoSerEntregues; track e.codigo) { <li>
                <a class="item" [routerLink]="['/cliente/encomendas', e.codigo]">
                  <span class="item-icone"><span class="icone">{{ e.status === 'ROTEIRIZADA' ? 'alt_route' : 'inventory_2' }}</span></span>
                  <span class="cresce">
                    <span class="item-titulo">{{ e.descricao }}</span>
                    <span class="item-sub" style="display:block">{{ e.codigo }} · {{ e.endereco }}, {{ e.bairro }}</span>
                  </span>
                  <app-status tipo="encomenda" [valor]="e.status" />
                </a></li>
              }
            </ul>
          } @else {
            <p class="pequeno texto-2">Nada esperando para sair.</p>
          }
        </section>

        <section>
          <h2 class="secao-titulo">Já entregues @if (grupos().entregues.length) { ({{ grupos().entregues.length }}) }</h2>
          @if (grupos().entregues.length) {
            <ul class="lista card sem-padding">
              @for (e of grupos().entregues; track e.codigo) { <li>
                <a class="item" [routerLink]="['/cliente/encomendas', e.codigo]">
                  <span class="item-icone verde"><span class="icone">check_circle</span></span>
                  <span class="cresce">
                    <span class="item-titulo">{{ e.descricao }}</span>
                    <span class="item-sub" style="display:block">{{ e.codigo }} · entregue {{ e.atualizadaEm | date: "dd/MM 'às' HH:mm" }}</span>
                  </span>
                  <span class="icone seta">chevron_right</span>
                </a></li>
              }
            </ul>
          } @else {
            <p class="pequeno texto-2">Nenhuma entregue ainda.</p>
          }
        </section>

        @if (grupos().canceladas.length) {
          <section>
            <h2 class="secao-titulo">Canceladas ({{ grupos().canceladas.length }})</h2>
            <ul class="lista card sem-padding">
              @for (e of grupos().canceladas; track e.codigo) { <li>
                <a class="item" [routerLink]="['/cliente/encomendas', e.codigo]">
                  <span class="cresce"><span class="item-titulo">{{ e.descricao }}</span>
                    <span class="item-sub" style="display:block">{{ e.codigo }}</span></span>
                  <app-status tipo="encomenda" [valor]="e.status" />
                </a></li>
              }
            </ul>
          </section>
        }
      }
    </div>`,
  styles: `
    .a-caminho { display: flex; flex-direction: column; gap: 10px; color: inherit; text-decoration: none !important; border-top: 4px solid var(--rc-azul); }
    .chegada { display: flex; align-items: center; gap: 8px; font-size: 18px; }
    .chegada .icone { color: var(--rc-azul); }
    .onde { display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--rc-azul); }
    .onde .icone { font-size: 20px; }
    .secao-titulo { display: flex; align-items: center; gap: 8px; }
    .ao-vivo .ponto { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--rc-verde); animation: pulsa 1.5s ease-in-out infinite; }
    .item-icone.verde { color: var(--rc-verde); }
    @keyframes pulsa { 50% { opacity: .3; } }
  `,
})
export class MinhasEncomendas implements OnDestroy {
  private readonly api = inject(EncomendasApi);
  protected readonly sessao = inject(SessaoService);
  protected readonly duracao = duracao;
  protected readonly ondeEsta = ondeEsta;
  protected readonly fila = fila;

  protected readonly lista = signal<EncomendaResumo[]>([]);
  /** Detalhe (rastreio) das que estão a caminho, por código. */
  protected readonly detalhes = signal<Record<string, Encomenda>>({});
  protected readonly carregando = signal(true);
  protected readonly atualizando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly grupos = computed(() => separar(this.lista()));

  private readonly timer = setInterval(() => { if (!document.hidden) this.carregar(); }, environment.acompanhamentoMs);
  private readonly aoVoltar = () => { if (!document.hidden) this.carregar(); };

  constructor() {
    this.carregar();
    document.addEventListener('visibilitychange', this.aoVoltar);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.aoVoltar);
  }

  protected carregar(): void {
    if (this.atualizando()) return;
    this.atualizando.set(true);
    this.api.listar({ size: 100 }).subscribe({
      next: p => {
        this.lista.set(p.content);
        this.erro.set(null);
        this.carregando.set(false);
        this.atualizando.set(false);
        this.carregarACaminho(p.content.filter(e => e.status === 'EM_TRANSITO'));
      },
      error: e => { this.erro.set(erroApi(e).mensagem); this.carregando.set(false); this.atualizando.set(false); },
    });
  }

  private carregarACaminho(aCaminho: EncomendaResumo[]): void {
    if (!aCaminho.length) { this.detalhes.set({}); return; }
    // uma falha numa delas não apaga as outras: fica com o último detalhe que deu certo
    forkJoin(aCaminho.map(e => this.api.buscar(e.codigo).pipe(catchError(() => of(this.detalhes()[e.codigo] ?? null)))))
      .subscribe(lista => {
        const novo: Record<string, Encomenda> = {};
        for (const d of lista) if (d) novo[d.encomenda.codigo] = d;
        this.detalhes.set(novo);
      });
  }
}

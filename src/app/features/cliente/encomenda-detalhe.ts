import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EncomendasApi } from '../../core/api/encomendas.api';
import { duracao, fila, ha, ondeEsta } from '../../core/encomenda';
import { erroApi } from '../../core/erro';
import { Encomenda, Ponto } from '../../core/modelos';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { MapaEncomenda } from '../../shared/mapa/mapa-encomenda';

/**
 * Rastreio de uma encomenda (GET /encomendas/{codigo}). A caminho: mapa com o entregador andando,
 * a rua onde ele está, quanto falta e quantas entregas ele faz antes da sua. Atualiza sozinho
 * enquanto a encomenda não foi entregue e a aba está visível.
 */
@Component({
  selector: 'app-encomenda-detalhe',
  imports: [RouterLink, DatePipe, DecimalPipe, EtiquetaStatus, MapaEncomenda],
  template: `
    <div class="conteudo">
      <a class="voltar" routerLink="/cliente"><span class="icone">arrow_back</span> Minhas encomendas</a>

      @if (erro() && !dados()) {
        <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div>
      } @else if (dados(); as d) {
        <div class="cabecalho-pagina">
          <div>
            <div class="linha quebra"><h1>{{ d.encomenda.descricao }}</h1><app-status tipo="encomenda" [valor]="d.encomenda.status" [comIcone]="true" />
              @if (aCaminho()) { <span class="ao-vivo"><span class="ponto"></span> ao vivo</span> }</div>
            <p class="mono">{{ d.encomenda.codigo }}</p>
          </div>
        </div>

        <div class="divisao larga">
          <div class="card sem-padding mapa-card">
            <app-mapa-encomenda [destino]="destino()!" [veiculo]="veiculo()" [rastro]="rastro()" />
          </div>

          <div class="pilha">
            @if (d.rastreio; as r) {
              @if (aCaminho()) {
                <div class="card pilha destaque">
                  @if (r.previsaoMinutos !== null) {
                    <div class="kpi"><span class="valor">~{{ duracao(r.previsaoMinutos) }}</span>
                      <span class="rotulo">para chegar @if (r.previsaoChegadaEm) { · por volta das <b>{{ r.previsaoChegadaEm | date: 'HH:mm' }}</b> }
                        @if (r.distanciaKm !== null) { · {{ r.distanciaKm | number: '1.0-1' }} km }</span></div>
                  }
                  @if (ondeEsta(r); as onde) {
                    <div class="onde"><span class="icone">location_on</span>{{ onde }}</div>
                  }
                  @if (fila(r); as f) { <span class="etiqueta {{ r.entregasAntes === 0 ? 'verde' : 'azul' }}">{{ f }}</span> }
                  <hr class="divisor" style="margin:2px 0">
                  <div class="linha"><span class="icone texto-2">local_shipping</span>
                    <span>{{ r.entregador }} · {{ r.veiculoModelo }} <span class="mono">{{ r.veiculoPlaca }}</span></span></div>
                  @if (r.localizacao; as loc) {
                    <span class="pequeno verde"><span class="icone" style="font-size:16px;vertical-align:-3px">my_location</span>
                      Posição {{ ha(loc.registradaEm, agora()) }} @if (loc.velocidadeKmH) { · {{ loc.velocidadeKmH | number: '1.0-0' }} km/h }</span>
                  } @else {
                    <span class="pequeno texto-2">Aguardando a primeira posição do GPS do entregador…</span>
                  }
                </div>
              } @else if (r.entregueEm) {
                <div class="card pilha entregue">
                  <div class="linha"><span class="icone verde" style="font-size:32px">check_circle</span>
                    <div><b>Entregue</b><div class="pequeno texto-2">{{ r.entregueEm | date: "dd/MM/yyyy 'às' HH:mm" }} · por {{ r.entregador }}</div></div></div>
                </div>
              } @else if (r.rotaStatus === 'PLANEJADA') {
                <div class="card pilha">
                  <b>Separada para entrega</b>
                  <span class="pequeno texto-2">Está na rota {{ r.rotaCodigo }} com {{ r.entregador }} ({{ r.veiculoModelo }} {{ r.veiculoPlaca }}).
                    Quando ele sair, você vê o veículo no mapa.</span>
                  @if (fila(r); as f) { <span class="etiqueta cinza">{{ f }}</span> }
                  @if (r.previsaoMinutos !== null) { <span class="pequeno">Leva ~{{ duracao(r.previsaoMinutos) }} depois que a rota sair.</span> }
                </div>
              }
            } @else if (d.encomenda.status === 'AGUARDANDO_ROTA') {
              <div class="card pilha"><b>Preparando</b>
                <span class="pequeno texto-2">A transportadora já recebeu e vai colocar numa rota de entrega.</span></div>
            }

            <div class="card pilha" style="gap:4px">
              <span class="mini forte texto-2">DESTINO</span>
              <b>{{ d.encomenda.destinatarioNome }}</b>
              <span class="pequeno texto-2">{{ d.encomenda.endereco }} — {{ d.encomenda.bairro }}, {{ d.encomenda.cidade }}/{{ d.encomenda.uf }}</span>
            </div>

            @if (d.eventos.length) {
              <div class="card">
                <span class="mini forte texto-2">HISTÓRICO</span>
                <ol class="tempo">
                  @for (ev of eventosRecentes(); track $index) {
                    <li><span class="bolinha"></span>
                      <div><div class="forte pequeno">{{ ev.descricao }}</div>
                        @if (ev.detalhe) { <div class="pequeno texto-2">{{ ev.detalhe }}</div> }
                        <div class="mini texto-3">{{ ev.ocorridoEm | date: "dd/MM 'às' HH:mm" }}</div></div></li>
                  }
                </ol>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="esqueleto" style="height:50dvh"></div>
      }
    </div>`,
  styles: `
    .mapa-card { height: 46dvh; min-height: 280px; margin-bottom: 16px; }
    /* .divisao vira duas colunas a partir de 1024px (styles.scss): o mapa fica parado ao lado enquanto rola */
    @media (min-width: 1024px) { .mapa-card { margin-bottom: 0; height: calc(100dvh - 200px); position: sticky; top: calc(var(--rc-cabecalho) + 16px); } }
    .destaque { border-top: 4px solid var(--rc-azul); gap: 10px; }
    .entregue { border-top: 4px solid var(--rc-verde); }
    .onde { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 17px; color: var(--rc-azul); }
    .ao-vivo { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--rc-verde); }
    .ao-vivo .ponto { width: 8px; height: 8px; border-radius: 50%; background: var(--rc-verde); animation: pulsa 1.5s ease-in-out infinite; }
    .tempo { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .tempo li { display: flex; gap: 10px; }
    .tempo .bolinha { flex: none; width: 10px; height: 10px; margin-top: 5px; border-radius: 50%; background: var(--rc-azul); }
    .tempo li + li .bolinha { background: var(--rc-texto-3); }
    @keyframes pulsa { 50% { opacity: .3; } }
  `,
})
export class EncomendaDetalhe implements OnInit, OnDestroy {
  private readonly api = inject(EncomendasApi);
  protected readonly duracao = duracao;
  protected readonly ondeEsta = ondeEsta;
  protected readonly fila = fila;
  protected readonly ha = ha;

  readonly codigo = input.required<string>();

  protected readonly dados = signal<Encomenda | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly agora = signal(Date.now());
  /** Posições vistas enquanto a tela está aberta (o rastro azul no mapa). */
  protected readonly rastro = signal<Ponto[]>([]);
  private timer: ReturnType<typeof setInterval> | null = null;
  private relogio: ReturnType<typeof setInterval> | null = null;
  private readonly aoVoltar = () => { if (!document.hidden) this.atualizar(); };

  protected readonly aCaminho = computed(() => this.dados()?.rastreio?.rotaStatus === 'EM_ANDAMENTO'
    && this.dados()?.encomenda.status === 'EM_TRANSITO');
  protected readonly destino = computed<Ponto | null>(() => {
    const e = this.dados()?.encomenda;
    return e ? { latitude: e.latitude, longitude: e.longitude } : null;
  });
  protected readonly veiculo = computed<Ponto | null>(() => {
    const l = this.aCaminho() ? this.dados()?.rastreio?.localizacao : null;
    return l ? { latitude: l.latitude, longitude: l.longitude } : null;
  });
  /** Mais recente primeiro; posições de GPS (LOCALIZACAO) não entram: já estão no mapa. */
  protected readonly eventosRecentes = computed(() =>
    [...(this.dados()?.eventos ?? [])].filter(e => e.tipo !== 'LOCALIZACAO').reverse());

  ngOnInit(): void {
    this.atualizar();
    this.timer = setInterval(() => {
      const st = this.dados()?.encomenda.status;
      if (!document.hidden && st !== 'ENTREGUE' && st !== 'CANCELADA') this.atualizar();
    }, environment.acompanhamentoMs);
    this.relogio = setInterval(() => this.agora.set(Date.now()), 1000);
    document.addEventListener('visibilitychange', this.aoVoltar);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.relogio) clearInterval(this.relogio);
    document.removeEventListener('visibilitychange', this.aoVoltar);
  }

  private atualizar(): void {
    this.api.buscar(this.codigo()).subscribe({
      next: d => {
        this.dados.set(d);
        this.erro.set(null);
        const l = d.rastreio?.localizacao;
        if (l) {
          this.rastro.update(r => {
            const u = r[r.length - 1];
            return u && u.latitude === l.latitude && u.longitude === l.longitude ? r : [...r, { latitude: l.latitude, longitude: l.longitude }];
          });
        }
      },
      error: e => this.erro.set(erroApi(e).mensagem),
    });
  }
}

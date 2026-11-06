import { Component, ElementRef, OnDestroy, afterNextRender, effect, input, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { Ponto } from '../../core/modelos';
import { criarMapa, iconeVeiculo, pino } from './leaflet';

/**
 * Mapa do Portal do Cliente: o destino da encomenda, o veículo andando e o rastro que ele fez
 * enquanto a tela está aberta. De propósito NÃO mostra a rota inteira: ela passa pelo endereço
 * de outros clientes.
 */
@Component({
  selector: 'app-mapa-encomenda',
  template: `
    <div class="mapa" #alvo></div>
    <button type="button" class="recentrar" (click)="enquadrar()" aria-label="Mostrar o veículo e o destino">
      <span class="icone">center_focus_strong</span>
    </button>`,
  styles: `
    :host { display: block; position: relative; height: 100%; min-height: 260px; border-radius: inherit; overflow: hidden; isolation: isolate; }
    .mapa { position: absolute; inset: 0; }
    .recentrar { position: absolute; right: 10px; top: 10px; z-index: 500; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer;
      background: #fff; box-shadow: var(--rc-sombra-alta); display: grid; place-items: center; color: var(--rc-texto); }
  `,
})
export class MapaEncomenda implements OnDestroy {
  readonly destino = input.required<Ponto>();
  readonly veiculo = input<Ponto | null>(null);
  readonly rastro = input<Ponto[]>([]);

  private readonly alvo = viewChild.required<ElementRef<HTMLElement>>('alvo');
  private mapa?: L.Map;
  private marcadorDestino?: L.Marker;
  private marcadorVeiculo?: L.Marker;
  private linhaRastro?: L.Polyline;
  private linhaFalta?: L.Polyline;
  private readonly pronto = signal(false);
  private enquadradoComVeiculo = false;

  constructor() {
    afterNextRender(() => {
      this.mapa = criarMapa(this.alvo().nativeElement);
      this.pronto.set(true);
    });

    effect(() => {
      if (!this.pronto() || !this.mapa) return;
      const d = this.destino();
      const ll: L.LatLngTuple = [d.latitude, d.longitude];
      if (this.marcadorDestino) this.marcadorDestino.setLatLng(ll);
      else {
        this.marcadorDestino = L.marker(ll, { icon: pino('★', 'entregue') }).bindPopup('<b>Destino</b> da sua encomenda').addTo(this.mapa);
        this.mapa.setView(ll, 15);
      }
    });

    effect(() => {
      if (!this.pronto() || !this.mapa) return;
      const v = this.veiculo();
      const d = this.destino();
      const rastro = this.rastro();
      if (!v) {
        this.marcadorVeiculo?.remove(); this.marcadorVeiculo = undefined;
        this.linhaFalta?.remove(); this.linhaFalta = undefined;
        this.linhaRastro?.remove(); this.linhaRastro = undefined;
        return;
      }
      const ll: L.LatLngTuple = [v.latitude, v.longitude];
      if (this.marcadorVeiculo) this.marcadorVeiculo.setLatLng(ll);
      else this.marcadorVeiculo = L.marker(ll, { icon: iconeVeiculo, zIndexOffset: 1000 }).bindPopup('<b>Entregador</b>').addTo(this.mapa);

      // tracejado = o que falta (em linha reta, só para dar a direção)
      const falta: L.LatLngTuple[] = [ll, [d.latitude, d.longitude]];
      if (this.linhaFalta) this.linhaFalta.setLatLngs(falta);
      else this.linhaFalta = L.polyline(falta, { color: '#2d3277', weight: 3, opacity: 0.5, dashArray: '6 8' }).addTo(this.mapa);

      const feito = rastro.map(p => [p.latitude, p.longitude] as L.LatLngTuple);
      if (this.linhaRastro) this.linhaRastro.setLatLngs(feito);
      else this.linhaRastro = L.polyline(feito, { color: '#2f6fec', weight: 5, opacity: 0.85 }).addTo(this.mapa);

      if (!this.enquadradoComVeiculo) {
        this.enquadradoComVeiculo = true;
        this.enquadrarQuandoTiverTamanho();
      }
      else if (!this.mapa.getBounds().contains(ll)) this.mapa.panTo(ll);
    });
  }

  /**
   * Com o container ainda sem altura (página montando), o fitBounds calcula o zoom para 0 px e cai no zoom
   * máximo, cortando o destino. Espera o mapa ter tamanho de verdade (até ~2 s) e só então enquadra.
   */
  private enquadrarQuandoTiverTamanho(tentativa = 0): void {
    if (!this.mapa) return;
    this.mapa.invalidateSize();
    if (this.mapa.getSize().y < 100 && tentativa < 20) {
      setTimeout(() => this.enquadrarQuandoTiverTamanho(tentativa + 1), 100);
      return;
    }
    this.enquadrar();
  }

  enquadrar(): void {
    if (!this.mapa) return;
    const d = this.destino();
    const v = this.veiculo();
    if (!v) { this.mapa.setView([d.latitude, d.longitude], 15); return; }
    this.mapa.fitBounds(L.latLngBounds([[d.latitude, d.longitude], [v.latitude, v.longitude]]), { padding: [48, 48], maxZoom: 16 });
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
  }
}

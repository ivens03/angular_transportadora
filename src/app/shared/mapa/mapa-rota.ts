import { Component, ElementRef, OnDestroy, afterNextRender, effect, input, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { Parada, Ponto } from '../../core/modelos';
import { criarMapa, escapar, iconeOrigem, iconeVeiculo, pino } from './leaflet';

/**
 * Mapa da rota: trajeto planejado (tracejado), percurso já feito (azul cheio),
 * paradas numeradas por status e a posição atual do veículo.
 * Redesenha sozinho quando qualquer input muda (signals + effect).
 */
@Component({
  selector: 'app-mapa-rota',
  template: `
    <div class="mapa" #alvo></div>
    <button type="button" class="recentrar" (click)="enquadrar()" aria-label="Centralizar no trajeto">
      <span class="icone">center_focus_strong</span>
    </button>`,
  styles: `
    :host { display: block; position: relative; height: 100%; min-height: 240px; border-radius: inherit; overflow: hidden; isolation: isolate; }
    .mapa { position: absolute; inset: 0; }
    .recentrar {
      position: absolute; right: 10px; top: 10px; z-index: 500;
      width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer;
      background: #fff; box-shadow: var(--rc-sombra-alta); display: grid; place-items: center; color: var(--rc-texto);
    }
  `,
})
export class MapaRota implements OnDestroy {
  readonly origem = input<Ponto | null>(null);
  readonly paradas = input<Parada[]>([]);
  readonly trajeto = input<Ponto[]>([]);
  readonly percurso = input<Ponto[]>([]);
  readonly atual = input<Ponto | null>(null);
  readonly proxima = input<number | null>(null);
  /** true: a câmera acompanha o veículo (tela do entregador). */
  readonly seguir = input(false);

  private readonly alvo = viewChild.required<ElementRef<HTMLElement>>('alvo');
  private mapa?: L.Map;
  private camadas = L.layerGroup();
  private veiculo?: L.Marker;
  private readonly pronto = signal(false);
  private enquadrado = false;

  constructor() {
    afterNextRender(() => {
      this.mapa = criarMapa(this.alvo().nativeElement);
      this.camadas.addTo(this.mapa);
      this.pronto.set(true);
    });

    // camadas "lentas": trajeto, paradas e percurso
    effect(() => {
      if (!this.pronto()) return;
      this.desenhar(this.origem(), this.paradas(), this.trajeto(), this.percurso(), this.proxima());
    });

    // marcador do veículo: só move (não recria tudo a cada posição)
    effect(() => {
      if (!this.pronto() || !this.mapa) return;
      const p = this.atual();
      if (!p) { this.veiculo?.remove(); this.veiculo = undefined; return; }
      const ll: L.LatLngTuple = [p.latitude, p.longitude];
      if (this.veiculo) this.veiculo.setLatLng(ll);
      else this.veiculo = L.marker(ll, { icon: iconeVeiculo, zIndexOffset: 1000 }).addTo(this.mapa);
      if (this.seguir()) this.mapa.panTo(ll, { animate: true });
    });
  }

  enquadrar(): void {
    if (!this.mapa) return;
    const pts: L.LatLngTuple[] = [
      ...this.trajeto().map(p => [p.latitude, p.longitude] as L.LatLngTuple),
      ...this.paradas().map(p => [p.latitude, p.longitude] as L.LatLngTuple),
    ];
    const a = this.atual();
    if (a) pts.push([a.latitude, a.longitude]);
    if (pts.length) this.mapa.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
  }

  private desenhar(origem: Ponto | null, paradas: Parada[], trajeto: Ponto[], percurso: Ponto[], proxima: number | null) {
    this.camadas.clearLayers();
    if (trajeto.length > 1) {
      L.polyline(trajeto.map(p => [p.latitude, p.longitude] as L.LatLngTuple),
        { color: '#2d3277', weight: 4, opacity: 0.55, dashArray: '8 8' }).addTo(this.camadas);
    }
    if (percurso.length > 1) {
      L.polyline(percurso.map(p => [p.latitude, p.longitude] as L.LatLngTuple),
        { color: '#2f6fec', weight: 5, opacity: 0.9 }).addTo(this.camadas);
    }
    if (origem) {
      L.marker([origem.latitude, origem.longitude], { icon: iconeOrigem }).bindPopup('<b>Origem</b> (depósito)').addTo(this.camadas);
    }
    for (const p of paradas) {
      const classe = p.ordem === proxima ? 'proxima' : p.status.toLowerCase();
      L.marker([p.latitude, p.longitude], { icon: pino(p.ordem, classe), zIndexOffset: p.ordem === proxima ? 500 : 0 })
        .bindPopup(`<b>${p.ordem}. ${escapar(p.destinatarioNome)}</b><br>${escapar(p.endereco)}<br>${escapar(p.bairro)}`)
        .addTo(this.camadas);
    }
    if (!this.enquadrado && (trajeto.length || paradas.length)) {
      this.enquadrado = true;
      this.enquadrar();
    }
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
  }
}

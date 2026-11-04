import { Component, ElementRef, OnDestroy, afterNextRender, effect, input, model, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { criarMapa, iconeSelecao } from './leaflet';

/**
 * Escolha de um ponto no mapa: toque/clique marca, e o pino pode ser arrastado.
 * Uso: <app-mapa-ponto [(latitude)]="lat" [(longitude)]="lng" />
 */
@Component({
  selector: 'app-mapa-ponto',
  template: `<div class="mapa" #alvo></div>
    @if (latitude() === null) { <div class="dica"><span class="icone">touch_app</span> Toque no mapa para marcar o local</div> }`,
  styles: `
    :host { display: block; position: relative; isolation: isolate; height: 260px; border-radius: var(--rc-raio); overflow: hidden; border: 1px solid var(--rc-borda); }
    .mapa { position: absolute; inset: 0; }
    .dica { position: absolute; left: 50%; top: 10px; transform: translateX(-50%); z-index: 500; background: rgba(0,0,0,.72); color: #fff;
      font-size: 13px; padding: 6px 12px; border-radius: 16px; display: flex; align-items: center; gap: 6px; white-space: nowrap; pointer-events: none; }
    .dica .icone { font-size: 18px; }
  `,
})
export class MapaPonto implements OnDestroy {
  readonly latitude = model<number | null>(null);
  readonly longitude = model<number | null>(null);
  readonly somenteLeitura = input(false);

  private readonly alvo = viewChild.required<ElementRef<HTMLElement>>('alvo');
  private mapa?: L.Map;
  private marcador?: L.Marker;
  private readonly pronto = signal(false);

  constructor() {
    afterNextRender(() => {
      this.mapa = criarMapa(this.alvo().nativeElement);
      if (!this.somenteLeitura()) {
        this.mapa.on('click', (e: L.LeafletMouseEvent) => this.marcar(e.latlng.lat, e.latlng.lng));
      }
      this.pronto.set(true);
    });

    effect(() => {
      const lat = this.latitude();
      const lng = this.longitude();
      if (!this.pronto() || !this.mapa) return;
      if (lat === null || lng === null) { this.marcador?.remove(); this.marcador = undefined; return; }
      if (this.marcador) {
        this.marcador.setLatLng([lat, lng]);
      } else {
        this.marcador = L.marker([lat, lng], { icon: iconeSelecao, draggable: !this.somenteLeitura() }).addTo(this.mapa);
        this.marcador.on('dragend', () => {
          const p = this.marcador!.getLatLng();
          this.marcar(p.lat, p.lng);
        });
      }
      if (!this.mapa.getBounds().pad(-0.2).contains([lat, lng])) this.mapa.setView([lat, lng], Math.max(this.mapa.getZoom(), 15));
    });
  }

  private marcar(lat: number, lng: number) {
    // o back-end aceita até 6 casas decimais (~11 cm)
    this.latitude.set(+lat.toFixed(6));
    this.longitude.set(+lng.toFixed(6));
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
  }
}

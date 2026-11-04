import * as L from 'leaflet';

/** Fortaleza/CE (centro aproximado) — onde o mapa abre quando não há nada para mostrar. */
export const CENTRO_PADRAO: L.LatLngTuple = [-3.7319, -38.5267];

/** Base cartográfica OpenStreetMap (sem chave; exige só a atribuição). */
export function criarMapa(el: HTMLElement, opcoes: L.MapOptions = {}): L.Map {
  const mapa = L.map(el, { zoomControl: false, attributionControl: true, ...opcoes }).setView(CENTRO_PADRAO, 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  L.control.zoom({ position: 'bottomright' }).addTo(mapa);
  // o container às vezes nasce com tamanho 0 (aba/folha abrindo): recalcula quando mudar
  const obs = new ResizeObserver(() => mapa.invalidateSize());
  obs.observe(el);
  mapa.on('unload', () => obs.disconnect());
  return mapa;
}

export function pino(texto: string | number, classe = ''): L.DivIcon {
  const grande = classe.includes('proxima');
  const t = grande ? 36 : 30;
  return L.divIcon({
    className: '',
    html: `<div class="mapa-pino ${classe}"><b>${texto}</b></div>`,
    iconSize: [t, t],
    iconAnchor: [t / 2, t],
    popupAnchor: [0, -t],
  });
}

export const iconeOrigem = L.divIcon({
  className: '',
  html: '<div class="mapa-origem"><span class="icone">warehouse</span></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const iconeVeiculo = L.divIcon({ className: '', html: '<div class="mapa-veiculo"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

export const iconeSelecao = L.divIcon({ className: '', html: '<div class="mapa-ponto-sel"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

export function escapar(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** Distância em linha reta (Haversine), em metros — mesma conta do back-end (rota/service/Geo.java). */
export function distanciaM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Link que abre a navegação turn-by-turn no app de mapas do celular. */
export function linkNavegacao(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
}

/** Data de hoje (fuso local) no formato yyyy-MM-dd. */
export function hojeIso(deslocDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + deslocDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

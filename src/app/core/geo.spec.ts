import { distanciaM, hojeIso, linkNavegacao } from './geo';

describe('geo', () => {
  it('calcula a distância em linha reta (CD Fortaleza → Aldeota ≈ 3,3 km)', () => {
    const d = distanciaM(-3.7319, -38.5267, -3.7374, -38.4977);
    expect(d).toBeGreaterThan(3200);
    expect(d).toBeLessThan(3400);
  });

  it('distância de um ponto para ele mesmo é zero', () => {
    expect(distanciaM(-3.7, -38.5, -3.7, -38.5)).toBe(0);
  });

  it('formata a data como yyyy-MM-dd', () => {
    expect(hojeIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('monta o link de navegação até o destino', () => {
    expect(linkNavegacao(-3.73, -38.49)).toContain('destination=-3.73,-38.49');
  });
});

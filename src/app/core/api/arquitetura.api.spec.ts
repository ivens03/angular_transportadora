import { camadasDoFluxo, porCategoria, tempoNoAr } from './arquitetura.api';

describe('arquitetura', () => {
  it('acende as camadas citadas nos passos do fluxo', () => {
    const f = { id: 'x', titulo: '', resumo: '', passos: [{ de: 'celular', para: 'api', oque: '' }, { de: 'api', para: 'banco', oque: '' }] };
    expect([...camadasDoFluxo(f)].sort()).toEqual(['api', 'banco', 'celular']);
    expect(camadasDoFluxo(null).size).toBe(0);
  });

  it('agrupa ferramentas pela categoria mantendo a ordem', () => {
    const g = porCategoria([
      { nome: 'A', categoria: 'Build', para: '' }, { nome: 'B', categoria: 'Infra', para: '' }, { nome: 'C', categoria: 'Build', para: '' },
    ]);
    expect(g.map(x => x.categoria)).toEqual(['Build', 'Infra']);
    expect(g[0].itens.map(x => x.nome)).toEqual(['A', 'C']);
  });

  it('tempo no ar em minutos, horas e dias', () => {
    expect(tempoNoAr('2026-11-06T10:00:00Z', '2026-11-06T10:42:00Z')).toBe('42 min');
    expect(tempoNoAr('2026-11-06T10:00:00Z', '2026-11-06T12:05:00Z')).toBe('2 h 5 min');
    expect(tempoNoAr('2026-11-04T10:00:00Z', '2026-11-06T13:00:00Z')).toBe('2 d 3 h');
  });
});

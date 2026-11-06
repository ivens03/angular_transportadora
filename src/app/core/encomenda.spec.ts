import { duracao, fila, ha, ondeEsta, separar } from './encomenda';
import { EncomendaResumo, Rastreio, StatusCarga } from './modelos';

const enc = (codigo: string, status: StatusCarga) => ({ codigo, status }) as EncomendaResumo;
const rastreio = (r: Partial<Rastreio>) => ({ entregasAntes: null, localizacao: null, ...r }) as Rastreio;

describe('encomenda (portal do cliente)', () => {
  it('separa em a caminho, vão ser entregues (separadas primeiro), entregues e canceladas', () => {
    const s = separar([enc('A', 'AGUARDANDO_ROTA'), enc('B', 'EM_TRANSITO'), enc('C', 'ENTREGUE'),
      enc('D', 'ROTEIRIZADA'), enc('E', 'CANCELADA')]);
    expect(s.aCaminho.map(e => e.codigo)).toEqual(['B']);
    expect(s.vaoSerEntregues.map(e => e.codigo)).toEqual(['D', 'A']);
    expect(s.entregues.map(e => e.codigo)).toEqual(['C']);
    expect(s.canceladas.map(e => e.codigo)).toEqual(['E']);
  });

  it('formata a duração como o webhook', () => {
    expect(duracao(12)).toBe('12 min');
    expect(duracao(65)).toBe('1 h 05 min');
  });

  it('diz a rua e o bairro do veículo', () => {
    const loc = { latitude: 0, longitude: 0, velocidadeKmH: null, registradaEm: '' };
    expect(ondeEsta(rastreio({ localizacao: { ...loc, rua: 'Rua Dom Lino', bairro: 'Amadeu Furtado' } }))).toBe('Na Rua Dom Lino, Amadeu Furtado');
    expect(ondeEsta(rastreio({ localizacao: { ...loc, rua: 'Rua Dom Lino', bairro: null } }))).toBe('Na Rua Dom Lino');
    expect(ondeEsta(rastreio({ localizacao: { ...loc, rua: null, bairro: null } }))).toBeNull();
    expect(ondeEsta(null)).toBeNull();
  });

  it('conta as entregas antes da sua', () => {
    expect(fila(rastreio({ entregasAntes: 0 }))).toBe('Sua encomenda é a próxima entrega');
    expect(fila(rastreio({ entregasAntes: 1 }))).toBe('1 entrega antes da sua');
    expect(fila(rastreio({ entregasAntes: 3 }))).toBe('3 entregas antes da sua');
    expect(fila(rastreio({}))).toBeNull();
  });

  it('diz há quanto tempo foi a última posição', () => {
    const agora = Date.parse('2026-11-06T12:00:00Z');
    expect(ha('2026-11-06T11:59:48Z', agora)).toBe('há 12 s');
    expect(ha('2026-11-06T11:57:00Z', agora)).toBe('há 3 min');
    expect(ha(null, agora)).toBeNull();
  });
});

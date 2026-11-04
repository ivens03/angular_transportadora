import { rotulo } from './rotulos';

describe('rotulo', () => {
  it('traduz o status da API', () => {
    expect(rotulo('carga', 'AGUARDANDO_ROTA').texto).toBe('Aguardando rota');
    expect(rotulo('consumo', 'CONSUMO_ACIMA_DO_ESPERADO').cor).toBe('vermelho');
  });

  it('valor desconhecido aparece cru, em cinza', () => {
    expect(rotulo('rota', 'NOVO_STATUS')).toEqual({ texto: 'NOVO_STATUS', cor: 'cinza' });
  });
});

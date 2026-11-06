import { aplicar } from './mascaras';

describe('máscaras dos campos', () => {
  it('CEP: só números, mostra 00000-000 e guarda 8 dígitos', () => {
    expect(aplicar('cep', '60325a001xyz')).toEqual({ exibir: '60325-001', valor: '60325001' });
    expect(aplicar('cep', '603')).toEqual({ exibir: '603', valor: '603' });
    expect(aplicar('cep', '603250019999').valor).toBe('60325001');
  });

  it('CNPJ numérico e alfanumérico, com os 2 últimos sempre números', () => {
    expect(aplicar('cnpj', '11222333000181')).toEqual({ exibir: '11.222.333/0001-81', valor: '11222333000181' });
    expect(aplicar('cnpj', '12.abc.345/01de-35')).toEqual({ exibir: '12.ABC.345/01DE-35', valor: '12ABC34501DE35' });
    expect(aplicar('cnpj', '12ABC34501DEXY').valor).toBe('12ABC34501DE'); // letra no dígito verificador não entra
    expect(aplicar('cnpj', '11222').exibir).toBe('11.222');
  });

  it('telefone: celular, fixo e enquanto digita', () => {
    expect(aplicar('telefone', '85999990000')).toEqual({ exibir: '(85) 99999-0000', valor: '85999990000' });
    expect(aplicar('telefone', '8532221111')).toEqual({ exibir: '(85) 3222-1111', valor: '8532221111' });
    expect(aplicar('telefone', '8').exibir).toBe('(8');
    expect(aplicar('telefone', '85999').exibir).toBe('(85) 999');
    expect(aplicar('telefone', 'abc').valor).toBe('');
  });

  it('placa: antiga e Mercosul, letra/número em cada posição', () => {
    expect(aplicar('placa', 'abc-1d23').valor).toBe('ABC1D23');
    expect(aplicar('placa', 'abc1234').valor).toBe('ABC1234');
    expect(aplicar('placa', '1abc').valor).toBe('ABC');        // número no começo não entra
    expect(aplicar('placa', 'abcd').valor).toBe('ABC');        // 4ª posição só número
    expect(aplicar('placa', 'ABC1D234').valor).toBe('ABC1D23'); // no máximo 7
  });

  it('RENAVAM, PIN, UF e código de ativação', () => {
    expect(aplicar('renavam', '0123456789a01').valor).toBe('01234567890');
    expect(aplicar('pin', '12a3456789').valor).toBe('123456');
    expect(aplicar('uf', 'c3e').valor).toBe('CE');
    expect(aplicar('codigo', 'ab-12 cd34ef').valor).toBe('AB12CD34');
  });

  it('matrícula em maiúsculas com o hífen do prefixo', () => {
    expect(aplicar('matricula', 'ent000001').valor).toBe('ENT-000001');
    expect(aplicar('matricula', 'cli-teste-01').valor).toBe('CLI-TESTE-01');
    expect(aplicar('matricula', 'fun 0000 02').valor).toBe('FUN-000002');
  });

  it('e-mail sem espaços e em minúsculas', () => {
    expect(aplicar('email', ' Ana.Silva @Empresa.com ').valor).toBe('ana.silva@empresa.com');
  });

  it('inteiro e ano viram número; inteiro mostra milhar', () => {
    expect(aplicar('inteiro', '15230')).toEqual({ exibir: '15.230', valor: 15230 });
    expect(aplicar('inteiro', '15.230km')).toEqual({ exibir: '15.230', valor: 15230 });
    expect(aplicar('inteiro', '')).toEqual({ exibir: '', valor: null });
    expect(aplicar('ano', '20245')).toEqual({ exibir: '2024', valor: 2024 });
  });

  it('decimal: vírgula, milhar, limite de casas e número do modelo', () => {
    expect(aplicar('decimal:2', '1250,509')).toEqual({ exibir: '1.250,50', valor: 1250.5 });
    expect(aplicar('decimal:2', '1.250,5')).toEqual({ exibir: '1.250,5', valor: 1250.5 });
    expect(aplicar('decimal:2', '18.')).toEqual({ exibir: '18,', valor: 18 });  // ponto do teclado vira vírgula
    expect(aplicar('decimal:3', ',12')).toEqual({ exibir: '0,12', valor: 0.12 });
    expect(aplicar('decimal:2', 'abc')).toEqual({ exibir: '', valor: null });
    expect(aplicar('decimal:2', 3.1)).toEqual({ exibir: '3,1', valor: 3.1 });
    expect(aplicar('decimal:2', 650)).toEqual({ exibir: '650', valor: 650 });
    expect(aplicar('decimal:2', '12.5', true).valor).toBe(12.5);   // colado
    expect(aplicar('decimal:2', '1.250', true).valor).toBe(1250);  // colado com milhar
  });
});

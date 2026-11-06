import { cnpjValido, formatarCnpj } from './cnpj';

describe('CNPJ', () => {
  it('valida o numérico e o alfanumérico (exemplo da Receita)', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11222333000182')).toBe(false);
    expect(cnpjValido('12.ABC.345/01DE-35')).toBe(true);
    expect(cnpjValido('12ABC34501DE36')).toBe(false);
    expect(cnpjValido('00000000000000')).toBe(false);
    expect(cnpjValido('')).toBe(false);
  });

  it('formata', () => {
    expect(formatarCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });
});

/**
 * Máscaras dos campos: cada uma recebe o que a pessoa digitou (ou colou) e devolve
 *  - exibir: o texto formatado que aparece no campo (60325-001, (85) 99999-0000, 1.250,50)
 *  - valor:  o que vai para o formulário/API (60325001, 85999990000, 1250.5)
 * Tudo que não cabe no formato é descartado na hora: letra no CEP nem aparece.
 * Funções puras (sem Angular) para testar fácil; a diretiva shared/mascara.ts só liga isso ao <input>.
 */
export type TipoMascara =
  | 'cep' | 'cnpj' | 'telefone' | 'placa' | 'renavam' | 'uf' | 'pin' | 'codigo' | 'matricula' | 'email'
  | 'ano' | 'inteiro' | `decimal:${number}`
  /** sem máscara (ex.: o mesmo campo é PIN para o entregador e senha livre para o painel) */
  | 'livre';

export interface Mascarado { exibir: string; valor: string | number | null; }

const digitos = (s: string, max: number) => s.replace(/\D/g, '').slice(0, max);

/** 1234567 → "1.234.567" */
function milhar(d: string): string {
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Ponto digitado no fim (teclado numérico do celular) vira vírgula; com vírgula, os pontos são de milhar.
 * Colado de outro lugar ("12.5", "1,250.75"), o último separador seguido de 1 a 3 dígitos é o decimal.
 */
function normalizarDecimal(s: string, colado: boolean): string {
  if (colado) {
    const m = /^(.*)[.,](\d{1,3})$/.exec(s.trim());
    if (m && !/^\d{1,3}(\.\d{3})+$/.test(s.trim())) return m[1].replace(/[.,]/g, '') + ',' + m[2];
    return s.replace(/\./g, '');
  }
  if (s.includes(',')) return s.replace(/\./g, '');
  if (s.endsWith('.')) return s.slice(0, -1).replace(/\./g, '') + ',';
  return s.replace(/\./g, '');
}

/** @param colado true quando o texto veio de um "colar" (aí o ponto pode ser decimal: "12.5") */
export function aplicar(tipo: TipoMascara, entrada: string | number | null | undefined, colado = false): Mascarado {
  let s = entrada === null || entrada === undefined ? '' : String(entrada);

  if (tipo.startsWith('decimal:')) {
    const casas = Number(tipo.split(':')[1]);
    // vindo do modelo (number) o separador é ponto; digitado, a vírgula é a decimal e o ponto é milhar
    s = typeof entrada === 'number' ? String(entrada).replace('.', ',') : normalizarDecimal(s, colado);
    const [int = '', ...resto] = s.split(',');
    const inteiro = digitos(int, 9).replace(/^0+(?=\d)/, '');
    const temVirgula = resto.length > 0 && casas > 0;
    const frac = temVirgula ? digitos(resto.join(''), casas) : '';
    if (!inteiro && !temVirgula) return { exibir: '', valor: null };
    const exibir = (inteiro ? milhar(inteiro) : '0') + (temVirgula ? ',' + frac : '');
    return { exibir, valor: Number(`${inteiro || '0'}.${frac || '0'}`) };
  }

  switch (tipo) {
    case 'livre': return { exibir: s, valor: s };
    case 'cep': {
      const d = digitos(s, 8);
      return { exibir: d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d, valor: d };
    }
    case 'cnpj': {
      // 12 letras/números + 2 dígitos verificadores (CNPJ alfanumérico; o numérico continua igual): 12.ABC.345/01DE-35
      let c = '';
      for (const ch of s.toUpperCase().replace(/[^A-Z0-9]/g, '')) {
        if (c.length >= 14) break;
        if (c.length < 12 || /\d/.test(ch)) c += ch;
      }
      const partes = [c.slice(0, 2), c.slice(2, 5), c.slice(5, 8), c.slice(8, 12), c.slice(12)];
      let exibir = partes[0];
      if (partes[1]) exibir += '.' + partes[1];
      if (partes[2]) exibir += '.' + partes[2];
      if (partes[3]) exibir += '/' + partes[3];
      if (partes[4]) exibir += '-' + partes[4];
      return { exibir, valor: c };
    }
    case 'telefone': {
      const d = digitos(s, 11);
      let exibir = d;
      if (d.length > 2) {
        const resto = d.slice(2);
        const corte = d.length === 11 ? 5 : 4; // celular (9 dígitos) ou fixo (8)
        exibir = `(${d.slice(0, 2)}) ` + (resto.length > corte ? `${resto.slice(0, corte)}-${resto.slice(corte)}` : resto);
      } else if (d.length) {
        exibir = `(${d}`;
      }
      return { exibir, valor: d };
    }
    case 'placa': {
      // ABC1234 (antiga) ou ABC1D23 (Mercosul): 3 letras, 1 número, letra ou número, 2 números
      let p = '';
      for (const c of s.toUpperCase().replace(/[^A-Z0-9]/g, '')) {
        const i = p.length;
        if (i >= 7) break;
        const ok = i < 3 ? /[A-Z]/.test(c) : i === 4 ? /[A-Z0-9]/.test(c) : /\d/.test(c);
        if (ok) p += c;
      }
      return { exibir: p, valor: p };
    }
    case 'renavam': { const d = digitos(s, 11); return { exibir: d, valor: d }; }
    case 'pin': { const d = digitos(s, 6); return { exibir: d, valor: d }; }
    case 'uf': { const u = s.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2); return { exibir: u, valor: u }; }
    case 'codigo': { const c = s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); return { exibir: c, valor: c }; }
    case 'matricula': {
      // ENT-000001 / FUN-… / CLI-…: maiúsculas, letras, números e hífen; "ent000001" vira "ENT-000001"
      let m = s.toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-{2,}/g, '-').slice(0, 20);
      m = m.replace(/^([A-Z]{3})(\d)/, '$1-$2');
      return { exibir: m, valor: m };
    }
    case 'email': { const e = s.replace(/\s/g, '').toLowerCase().slice(0, 200); return { exibir: e, valor: e }; }
    case 'ano': {
      const d = digitos(s, 4);
      return { exibir: d, valor: d ? Number(d) : null };
    }
    case 'inteiro': {
      const d = digitos(s, 7).replace(/^0+(?=\d)/, '');
      return { exibir: milhar(d), valor: d ? Number(d) : null };
    }
  }
  return { exibir: s, valor: s };
}

/** Caractere que "conta" no formato (o resto é enfeite: hífen, parênteses, ponto de milhar). Usado para manter o cursor no lugar. */
export function significativo(tipo: TipoMascara, c: string): boolean {
  if (tipo.startsWith('decimal:')) return /[\d,]/.test(c);
  switch (tipo) {
    case 'placa': case 'codigo': case 'uf': case 'cnpj': return /[A-Za-z0-9]/.test(c);
    case 'matricula': return /[A-Za-z0-9]/.test(c);
    case 'email': return !/\s/.test(c);
    default: return /\d/.test(c);
  }
}

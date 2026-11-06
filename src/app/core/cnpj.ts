/**
 * Dígitos verificadores do CNPJ, já no formato alfanumérico (Receita, julho/2026): 12 letras/números + 2 dígitos.
 * Cada caractere vale o código ASCII − 48 ('0'..'9' = 0..9, 'A' = 17…), então o CNPJ só com números continua igual.
 * Mesma regra do back-end (usuario/model/Cnpj.java): aqui serve para avisar antes de enviar.
 */
export function cnpjValido(cnpj: string | null | undefined): boolean {
  const c = (cnpj ?? '').replace(/[.\-/\s]/g, '').toUpperCase();
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(.)\1+$/.test(c)) return false;
  const dv = (base: string, pesos: number[]) => {
    const r = [...base].reduce((s, ch, i) => s + (ch.charCodeAt(0) - 48) * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = dv(c.slice(0, 12), p1);
  const d2 = dv(c.slice(0, 12) + d1, [6, ...p1]);
  return c.endsWith(`${d1}${d2}`);
}

/** "11222333000181" → "11.222.333/0001-81" */
export function formatarCnpj(cnpj: string | null | undefined): string {
  const c = cnpj ?? '';
  return c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : c;
}

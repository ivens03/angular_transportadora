import { EncomendaResumo, Rastreio } from './modelos';

/** As encomendas do cliente nas três perguntas que ele faz: o que está vindo agora, o que ainda vem e o que já chegou. */
export interface Separadas {
  aCaminho: EncomendaResumo[];
  vaoSerEntregues: EncomendaResumo[];
  entregues: EncomendaResumo[];
  canceladas: EncomendaResumo[];
}

export function separar(lista: EncomendaResumo[]): Separadas {
  const s: Separadas = { aCaminho: [], vaoSerEntregues: [], entregues: [], canceladas: [] };
  for (const e of lista) {
    switch (e.status) {
      case 'EM_TRANSITO': s.aCaminho.push(e); break;
      case 'ROTEIRIZADA':
      case 'AGUARDANDO_ROTA': s.vaoSerEntregues.push(e); break;
      case 'ENTREGUE': s.entregues.push(e); break;
      default: s.canceladas.push(e);
    }
  }
  // "vão ser entregues": as já separadas numa rota primeiro (saem antes)
  s.vaoSerEntregues.sort((a, b) => (a.status === b.status ? 0 : a.status === 'ROTEIRIZADA' ? -1 : 1));
  return s;
}

/** 12 → "12 min"; 65 → "1 h 05 min" (mesmo formato do webhook). */
export function duracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`;
}

/** "Na Avenida Bezerra de Menezes, São Gerardo"; nulo sem posição ou sem nome de rua. */
export function ondeEsta(r: Rastreio | null | undefined): string | null {
  const loc = r?.localizacao;
  if (!loc?.rua) return null;
  return loc.bairro ? `Na ${loc.rua}, ${loc.bairro}` : `Na ${loc.rua}`;
}

/** Quantas entregas o entregador ainda faz antes de chegar na sua. */
export function fila(r: Rastreio | null | undefined): string | null {
  const n = r?.entregasAntes;
  if (n === null || n === undefined) return null;
  if (n === 0) return 'Sua encomenda é a próxima entrega';
  return n === 1 ? '1 entrega antes da sua' : `${n} entregas antes da sua`;
}

/** "há 12 s" / "há 3 min" desde a última posição do veículo. */
export function ha(iso: string | null | undefined, agora = Date.now()): string | null {
  if (!iso) return null;
  const s = Math.max(0, Math.round((agora - Date.parse(iso)) / 1000));
  return s < 60 ? `há ${s} s` : s < 3600 ? `há ${Math.round(s / 60)} min` : `há ${Math.round(s / 3600)} h`;
}

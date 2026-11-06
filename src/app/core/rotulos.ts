/** Textos e cores dos enums da API, num lugar só. */
export type Cor = 'verde' | 'azul' | 'laranja' | 'vermelho' | 'cinza' | 'amarelo';
interface Rotulo { texto: string; cor: Cor; icone?: string; }

export const ROTULOS: Record<string, Record<string, Rotulo>> = {
  carga: {
    AGUARDANDO_ROTA: { texto: 'Aguardando rota', cor: 'amarelo', icone: 'schedule' },
    ROTEIRIZADA: { texto: 'Roteirizada', cor: 'azul', icone: 'alt_route' },
    EM_TRANSITO: { texto: 'Em trânsito', cor: 'azul', icone: 'local_shipping' },
    ENTREGUE: { texto: 'Entregue', cor: 'verde', icone: 'check_circle' },
    CANCELADA: { texto: 'Cancelada', cor: 'cinza', icone: 'block' },
  },
  /** A mesma carga, com as palavras do cliente (Portal do Cliente). */
  encomenda: {
    AGUARDANDO_ROTA: { texto: 'Preparando', cor: 'amarelo', icone: 'inventory_2' },
    ROTEIRIZADA: { texto: 'Separada para entrega', cor: 'azul', icone: 'alt_route' },
    EM_TRANSITO: { texto: 'A caminho', cor: 'azul', icone: 'local_shipping' },
    ENTREGUE: { texto: 'Entregue', cor: 'verde', icone: 'check_circle' },
    CANCELADA: { texto: 'Cancelada', cor: 'cinza', icone: 'block' },
  },
  rota: {
    PLANEJADA: { texto: 'Planejada', cor: 'amarelo', icone: 'event' },
    EM_ANDAMENTO: { texto: 'Em andamento', cor: 'azul', icone: 'local_shipping' },
    CONCLUIDA: { texto: 'Concluída', cor: 'verde', icone: 'flag' },
    CANCELADA: { texto: 'Cancelada', cor: 'cinza', icone: 'block' },
  },
  parada: {
    PENDENTE: { texto: 'Pendente', cor: 'cinza', icone: 'radio_button_unchecked' },
    ENTREGUE: { texto: 'Entregue', cor: 'verde', icone: 'check_circle' },
    NAO_ENTREGUE: { texto: 'Não entregue', cor: 'vermelho', icone: 'cancel' },
  },
  veiculo: {
    ATIVO: { texto: 'Ativo', cor: 'verde' },
    EM_MANUTENCAO: { texto: 'Em manutenção', cor: 'laranja' },
    INATIVO: { texto: 'Inativo', cor: 'cinza' },
  },
  usuario: {
    PENDENTE_ATIVACAO: { texto: 'Aguardando ativação', cor: 'amarelo' },
    ATIVO: { texto: 'Ativo', cor: 'verde' },
    BLOQUEADO: { texto: 'Bloqueado', cor: 'vermelho' },
  },
  consumo: {
    DENTRO_DO_ESPERADO: { texto: 'Dentro do esperado', cor: 'verde' },
    CONSUMO_ACIMA_DO_ESPERADO: { texto: 'Consumo acima', cor: 'vermelho' },
    SEM_REFERENCIA: { texto: 'Sem referência', cor: 'cinza' },
    DADOS_INSUFICIENTES: { texto: 'Poucos dados', cor: 'cinza' },
  },
};

export const TIPOS_VEICULO: Record<string, { texto: string; icone: string }> = {
  MOTO: { texto: 'Moto', icone: 'two_wheeler' },
  CARRO: { texto: 'Carro', icone: 'directions_car' },
  UTILITARIO: { texto: 'Utilitário', icone: 'airport_shuttle' },
  VAN: { texto: 'Van', icone: 'airport_shuttle' },
  VUC: { texto: 'VUC', icone: 'local_shipping' },
  CAMINHAO: { texto: 'Caminhão', icone: 'local_shipping' },
};

export const COMBUSTIVEIS: Record<string, string> = { GASOLINA: 'Gasolina', ETANOL: 'Etanol', FLEX: 'Flex', DIESEL: 'Diesel' };

export const PERFIS: Record<string, { texto: string; icone: string }> = {
  ENTREGADOR: { texto: 'Entregador', icone: 'two_wheeler' },
  CLIENTE: { texto: 'Cliente', icone: 'storefront' },
  ADMINISTRATIVO: { texto: 'Administrativo', icone: 'badge' },
  SUPORTE: { texto: 'Suporte', icone: 'support_agent' },
  FINANCEIRO: { texto: 'Financeiro', icone: 'payments' },
  DESENVOLVIMENTO: { texto: 'Desenvolvimento', icone: 'terminal' },
};

export function rotulo(tipo: string, valor: string | null | undefined): Rotulo {
  return (valor && ROTULOS[tipo]?.[valor]) || { texto: valor ?? '—', cor: 'cinza' };
}

import { Permissao } from '../core/modelos';

export interface ItemMenu { rotulo: string; icone: string; link: string; permissao?: string; exato?: boolean; }

/** Itens do painel: cada um só aparece para quem tem a permissão (igual ao SecurityConfig). */
export const MENU_PAINEL: ItemMenu[] = [
  { rotulo: 'Início', icone: 'home', link: '/painel', exato: true },
  { rotulo: 'Cargas', icone: 'inventory_2', link: '/painel/cargas', permissao: Permissao.ENTREGA_CADASTRAR },
  { rotulo: 'Rotas', icone: 'alt_route', link: '/painel/rotas', permissao: Permissao.MAPA_ACOMPANHAR },
  { rotulo: 'Frota', icone: 'local_shipping', link: '/painel/veiculos', permissao: Permissao.VEICULO_GERENCIAR },
  { rotulo: 'Consumo', icone: 'local_gas_station', link: '/painel/consumo', permissao: Permissao.CONSUMO_VER_METRICAS },
  { rotulo: 'Usuários', icone: 'group', link: '/painel/usuarios', permissao: Permissao.USUARIO_GERENCIAR },
  { rotulo: 'Monitoramento', icone: 'monitor_heart', link: '/painel/monitoramento', permissao: Permissao.MENSAGERIA_MONITORAR },
];

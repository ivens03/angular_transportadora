import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { comPermissao, soCliente, soDeslogado, soEntregador, soPainel } from './core/auth/guardas';
import { SessaoService } from './core/auth/sessao.service';
import { Permissao } from './core/modelos';
import { AppLayout } from './layout/app-layout';
import { ClienteLayout } from './layout/cliente-layout';
import { PainelLayout } from './layout/painel-layout';

const t = (titulo: string) => `${titulo} · RotaCerta`;

/**
 * Três "casas":
 *  /app     → entregador (credencial APP_ENTREGADOR), pensado 100% para celular
 *  /painel  → funcionários (PAINEL_WEB); cada seção exige a mesma permissão que a API exige
 *  /cliente → Portal do Cliente (perfil CLIENTE): encomendas, entregador no mapa, entregues
 * Toda tela é carregada sob demanda (loadComponent) para o celular baixar só o que usa.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: () => {
    const s = inject(SessaoService);
    return s.logado() ? s.inicio() : '/entrar';
  } },

  { path: 'entrar', title: t('Entrar'), canActivate: [soDeslogado], loadComponent: () => import('./features/acesso/entrar').then(m => m.Entrar) },
  { path: 'primeiro-acesso', title: t('Primeiro acesso'), loadComponent: () => import('./features/acesso/primeiro-acesso').then(m => m.PrimeiroAcesso) },
  { path: 'trocar-credencial', title: t('Trocar senha/PIN'), loadComponent: () => import('./features/acesso/trocar-credencial').then(m => m.TrocarCredencial) },

  {
    path: 'app', component: AppLayout, canMatch: [soEntregador],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'rotas' },
      { path: 'rotas', title: t('Minhas rotas'), loadComponent: () => import('./features/entregador/minhas-rotas').then(m => m.MinhasRotas) },
      { path: 'rotas/:id', title: t('Rota'), loadComponent: () => import('./features/entregador/rota-execucao').then(m => m.RotaExecucao) },
      { path: 'conta', title: t('Minha conta'), loadComponent: () => import('./features/conta/conta').then(m => m.Conta) },
    ],
  },

  {
    path: 'cliente', component: ClienteLayout, canMatch: [soCliente],
    children: [
      { path: '', title: t('Minhas encomendas'), loadComponent: () => import('./features/cliente/minhas-encomendas').then(m => m.MinhasEncomendas) },
      { path: 'encomendas/:codigo', title: t('Encomenda'), loadComponent: () => import('./features/cliente/encomenda-detalhe').then(m => m.EncomendaDetalhe) },
    ],
  },

  {
    path: 'painel', component: PainelLayout, canMatch: [soPainel], canActivateChild: [comPermissao],
    children: [
      { path: '', title: t('Início'), loadComponent: () => import('./features/inicio/inicio').then(m => m.Inicio) },

      { path: 'cargas', title: t('Cargas'), data: { permissao: Permissao.ENTREGA_CADASTRAR }, loadComponent: () => import('./features/cargas/cargas-lista').then(m => m.CargasLista) },
      { path: 'cargas/nova', title: t('Nova entrega'), data: { permissao: Permissao.ENTREGA_CADASTRAR }, loadComponent: () => import('./features/cargas/carga-form').then(m => m.CargaFormulario) },
      { path: 'cargas/:id', title: t('Carga'), data: { permissao: Permissao.ENTREGA_CADASTRAR }, loadComponent: () => import('./features/cargas/carga-form').then(m => m.CargaFormulario) },

      { path: 'empresas', title: t('Empresas'), data: { permissao: Permissao.CLIENTE_CADASTRAR }, loadComponent: () => import('./features/empresas/empresas-lista').then(m => m.EmpresasLista) },
      { path: 'empresas/nova', title: t('Nova empresa'), data: { permissao: Permissao.CLIENTE_CADASTRAR }, loadComponent: () => import('./features/empresas/empresa-nova').then(m => m.EmpresaNova) },

      { path: 'rotas', title: t('Rotas'), data: { permissao: Permissao.MAPA_ACOMPANHAR }, loadComponent: () => import('./features/rotas/rotas-lista').then(m => m.RotasLista) },
      { path: 'rotas/nova', title: t('Montar rota'), data: { permissao: Permissao.ENTREGA_CADASTRAR }, loadComponent: () => import('./features/rotas/rota-nova').then(m => m.RotaNova) },
      { path: 'rotas/:id', title: t('Acompanhar rota'), data: { permissao: Permissao.MAPA_ACOMPANHAR }, loadComponent: () => import('./features/rotas/rota-acompanhar').then(m => m.RotaAcompanhar) },

      { path: 'veiculos', title: t('Frota'), data: { permissao: Permissao.VEICULO_GERENCIAR }, loadComponent: () => import('./features/veiculos/veiculos-lista').then(m => m.VeiculosLista) },
      { path: 'veiculos/novo', title: t('Novo veículo'), data: { permissao: Permissao.VEICULO_GERENCIAR }, loadComponent: () => import('./features/veiculos/veiculo-form').then(m => m.VeiculoFormulario) },
      { path: 'veiculos/:id', title: t('Veículo'), data: { permissao: Permissao.VEICULO_GERENCIAR }, loadComponent: () => import('./features/veiculos/veiculo-detalhe').then(m => m.VeiculoDetalhe) },
      { path: 'veiculos/:id/editar', title: t('Editar veículo'), data: { permissao: Permissao.VEICULO_GERENCIAR }, loadComponent: () => import('./features/veiculos/veiculo-form').then(m => m.VeiculoFormulario) },

      { path: 'consumo', title: t('Consumo da frota'), data: { permissao: Permissao.CONSUMO_VER_METRICAS }, loadComponent: () => import('./features/consumo/consumo').then(m => m.Consumo) },

      { path: 'usuarios', title: t('Usuários'), data: { permissao: Permissao.USUARIO_GERENCIAR }, loadComponent: () => import('./features/usuarios/usuarios-lista').then(m => m.UsuariosLista) },
      { path: 'usuarios/novo', title: t('Novo usuário'), data: { permissao: Permissao.USUARIO_GERENCIAR }, loadComponent: () => import('./features/usuarios/usuario-novo').then(m => m.UsuarioNovo) },
      { path: 'usuarios/:matricula', title: t('Usuário'), data: { permissao: Permissao.USUARIO_GERENCIAR }, loadComponent: () => import('./features/usuarios/usuario-detalhe').then(m => m.UsuarioDetalhe) },

      { path: 'monitoramento', title: t('Monitoramento'), data: { permissao: Permissao.MENSAGERIA_MONITORAR }, loadComponent: () => import('./features/monitoramento/monitoramento').then(m => m.Monitoramento) },
      { path: 'como-funciona', title: t('Como funciona'), data: { permissao: Permissao.MENSAGERIA_MONITORAR }, loadComponent: () => import('./features/como-funciona/como-funciona').then(m => m.ComoFunciona) },
      { path: 'conta', title: t('Minha conta'), loadComponent: () => import('./features/conta/conta').then(m => m.Conta) },
    ],
  },

  { path: '**', redirectTo: '' },
];

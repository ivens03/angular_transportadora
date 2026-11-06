import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlSegment } from '@angular/router';
import { SessaoService } from './sessao.service';

/** Manda para o login lembrando a página pedida (?voltar=/painel/rotas/3). */
function paraLogin(segmentos: UrlSegment[]) {
  const voltar = '/' + segmentos.map(s => s.path).join('/');
  return inject(Router).createUrlTree(['/entrar'], { queryParams: { voltar } });
}

/** Só deixa entrar no app quem tem credencial APP_ENTREGADOR. */
export const soEntregador: CanMatchFn = (_rota, segmentos) => {
  const s = inject(SessaoService);
  if (!s.logado()) return paraLogin(segmentos);
  return s.ehEntregador() || inject(Router).createUrlTree([s.inicio()]);
};

/** Só deixa entrar no painel quem é funcionário (credencial PAINEL_WEB e não é cliente). */
export const soPainel: CanMatchFn = (_rota, segmentos) => {
  const s = inject(SessaoService);
  if (!s.logado()) return paraLogin(segmentos);
  return (!s.ehEntregador() && !s.ehCliente()) || inject(Router).createUrlTree([s.inicio()]);
};

/** Portal do Cliente: só o perfil CLIENTE (a API ainda confere a permissão encomenda:acompanhar). */
export const soCliente: CanMatchFn = (_rota, segmentos) => {
  const s = inject(SessaoService);
  if (!s.logado()) return paraLogin(segmentos);
  return s.ehCliente() || inject(Router).createUrlTree([s.inicio()]);
};

/** Tela de login: quem já está logado vai direto para o início. */
export const soDeslogado: CanActivateFn = () => {
  const s = inject(SessaoService);
  return !s.logado() || inject(Router).createUrlTree([s.inicio()]);
};

/** Rota com data: { permissao: 'x:y' } — mesmo critério do SecurityConfig do back-end. */
export const comPermissao: CanActivateFn = rota => {
  const s = inject(SessaoService);
  const exigida = rota.data['permissao'] as string | undefined;
  return !exigida || s.tem(exigida) || inject(Router).createUrlTree([s.inicio()]);
};

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
  return s.ehEntregador() || inject(Router).createUrlTree(['/painel']);
};

/** Só deixa entrar no painel quem tem credencial PAINEL_WEB. */
export const soPainel: CanMatchFn = (_rota, segmentos) => {
  const s = inject(SessaoService);
  if (!s.logado()) return paraLogin(segmentos);
  return !s.ehEntregador() || inject(Router).createUrlTree(['/app']);
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

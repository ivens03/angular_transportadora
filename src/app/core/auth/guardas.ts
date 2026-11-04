import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { SessaoService } from './sessao.service';

/** Só deixa entrar no app quem tem credencial APP_ENTREGADOR. */
export const soEntregador: CanMatchFn = () => {
  const s = inject(SessaoService);
  if (!s.logado()) return inject(Router).createUrlTree(['/entrar']);
  return s.ehEntregador() || inject(Router).createUrlTree(['/painel']);
};

/** Só deixa entrar no painel quem tem credencial PAINEL_WEB. */
export const soPainel: CanMatchFn = () => {
  const s = inject(SessaoService);
  if (!s.logado()) return inject(Router).createUrlTree(['/entrar']);
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

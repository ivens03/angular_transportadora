import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessaoService } from './sessao.service';

/** Põe o Bearer nas chamadas à API e derruba a sessão quando o token deixa de valer (401). */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const sessao = inject(SessaoService);
  const daApi = req.url.startsWith(environment.api);
  const publica = req.url.includes('/auth/') && !req.url.endsWith('/auth/sessao');
  const token = sessao.token();

  const pedido = daApi && token && !req.headers.has('Authorization') && !publica
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(pedido).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse && erro.status === 401 && daApi && !publica && sessao.logado()) {
        sessao.sair('expirou');
      }
      return throwError(() => erro);
    }),
  );
};

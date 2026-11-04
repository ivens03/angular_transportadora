import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, switchMap, tap } from 'rxjs';
import { AutenticacaoApi } from '../api/autenticacao.api';
import { Sessao, TokenResposta } from '../modelos';

interface Guardado { token: string; sessao: Sessao; credencialExpiraEm: string | null; }

const CHAVE = 'rotacerta.sessao';

/**
 * Estado de login em signals. O token fica no localStorage para o entregador
 * não perder a sessão ao bloquear o celular ou recarregar a página.
 */
@Injectable({ providedIn: 'root' })
export class SessaoService {
  private readonly api = inject(AutenticacaoApi);
  private readonly router = inject(Router);
  private readonly estado = signal<Guardado | null>(ler());

  readonly sessao = computed(() => this.estado()?.sessao ?? null);
  readonly token = computed(() => this.estado()?.token ?? null);
  readonly logado = computed(() => this.estado() !== null);
  readonly ehEntregador = computed(() => this.sessao()?.tipoCredencial === 'APP_ENTREGADOR');
  readonly primeiroNome = computed(() => this.sessao()?.nome.split(' ')[0] ?? '');
  /** Dias até a senha/PIN vencer (o back-end exige troca a cada 30 dias). */
  readonly diasParaVencer = computed(() => {
    const vence = this.estado()?.credencialExpiraEm;
    return vence ? Math.ceil((Date.parse(vence) - Date.now()) / 86_400_000) : null;
  });

  /** Token emitido → busca a sessão (nome e permissões) e guarda tudo. */
  iniciar(token$: Observable<TokenResposta>): Observable<Sessao> {
    return token$.pipe(
      switchMap(t => this.api.sessao(t.accessToken).pipe(map(sessao => ({ t, sessao })))),
      tap(({ t, sessao }) => {
        const g: Guardado = { token: t.accessToken, sessao, credencialExpiraEm: t.credencialExpiraEm };
        localStorage.setItem(CHAVE, JSON.stringify(g));
        this.estado.set(g);
      }),
      map(({ sessao }) => sessao),
    );
  }

  tem(permissao: string): boolean {
    return this.sessao()?.permissoes.includes(permissao) ?? false;
  }

  /** Para onde vai quem acabou de entrar. */
  inicio(): string {
    return this.ehEntregador() ? '/app' : '/painel';
  }

  sair(motivo?: 'expirou'): void {
    localStorage.removeItem(CHAVE);
    this.estado.set(null);
    this.router.navigate(['/entrar'], motivo ? { queryParams: { motivo } } : undefined);
  }
}

function ler(): Guardado | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const g = JSON.parse(bruto) as Guardado;
    // token vencido não serve para nada: começa deslogado
    return Date.parse(g.sessao.expiraEm) > Date.now() ? g : (localStorage.removeItem(CHAVE), null);
  } catch {
    return null;
  }
}

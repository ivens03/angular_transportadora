import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CredencialResposta, Sessao, TokenResposta } from '../modelos';
import { MERGE_PATCH } from './consulta';

@Injectable({ providedIn: 'root' })
export class AutenticacaoApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.api}/auth`;

  entrarApp(matricula: string, pin: string) {
    return this.http.post<TokenResposta>(`${this.url}/app/tokens`, { matricula, pin });
  }

  entrarPainel(email: string, senha: string) {
    return this.http.post<TokenResposta>(`${this.url}/painel/tokens`, { email, senha });
  }

  /** Primeiro acesso: código de ativação → PIN (app) ou senha (painel). */
  ativar(matricula: string, codigoAtivacao: string, credencial: string) {
    return this.http.post<CredencialResposta>(`${this.url}/credenciais`, { matricula, codigoAtivacao, credencial });
  }

  trocarCredencial(matricula: string, credencialAtual: string, novaCredencial: string) {
    return this.http.patch<CredencialResposta>(`${this.url}/credenciais/${encodeURIComponent(matricula)}`,
      { credencialAtual, novaCredencial }, MERGE_PATCH);
  }

  sessao(token?: string) {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return this.http.get<Sessao>(`${this.url}/sessao`, { headers });
  }
}

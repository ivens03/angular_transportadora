import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CodigoAtivacao, Departamento, Entregador, Pagina, StatusUsuario, Usuario, Vinculo } from '../modelos';
import { MERGE_PATCH, parametros } from './consulta';

export interface NovoUsuario { nome: string; email?: string | null; vinculo: Vinculo; departamento?: Departamento | null; }

@Injectable({ providedIn: 'root' })
export class UsuariosApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.api}/usuarios`;

  listar(page = 0, size = 20, sort = 'nome,asc') {
    return this.http.get<Pagina<Usuario>>(this.url, { params: parametros({ page, size, sort }) });
  }

  buscar(matricula: string) {
    return this.http.get<Usuario>(`${this.url}/${encodeURIComponent(matricula)}`);
  }

  criar(u: NovoUsuario) {
    return this.http.post<CodigoAtivacao>(this.url, u);
  }

  atualizar(matricula: string, mudancas: { nome?: string; email?: string | null; status?: StatusUsuario }) {
    return this.http.patch<Usuario>(`${this.url}/${encodeURIComponent(matricula)}`, mudancas, MERGE_PATCH);
  }

  novoCodigo(matricula: string) {
    return this.http.post<CodigoAtivacao>(`${this.url}/${encodeURIComponent(matricula)}/codigos-ativacao`, {});
  }

  /** Visão mínima para o Suporte escolher quem leva a rota. */
  entregadores(status: StatusUsuario | null = 'ATIVO') {
    return this.http.get<Pagina<Entregador>>(`${environment.api}/entregadores`, { params: parametros({ status, size: 100 }) });
  }
}

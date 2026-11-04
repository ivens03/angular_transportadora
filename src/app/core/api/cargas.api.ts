import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Carga, CargaForm, Pagina, StatusCarga } from '../modelos';
import { MERGE_PATCH, parametros } from './consulta';

export interface FiltroCargas { status?: StatusCarga | null; cidade?: string | null; bairro?: string | null; page?: number; size?: number; sort?: string; }

@Injectable({ providedIn: 'root' })
export class CargasApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.api}/cargas`;

  listar(f: FiltroCargas = {}) {
    return this.http.get<Pagina<Carga>>(this.url, { params: parametros({ ...f }) });
  }

  buscar(id: number) {
    return this.http.get<Carga>(`${this.url}/${id}`);
  }

  cadastrar(carga: CargaForm) {
    return this.http.post<Carga>(this.url, carga);
  }

  atualizar(id: number, mudancas: Partial<CargaForm> & { status?: 'CANCELADA' }) {
    return this.http.patch<Carga>(`${this.url}/${id}`, mudancas, MERGE_PATCH);
  }
}

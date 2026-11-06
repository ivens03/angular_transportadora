import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Encomenda, EncomendaResumo, Pagina, StatusCarga } from '../modelos';
import { parametros } from './consulta';

/**
 * Portal do Cliente (permissão encomenda:acompanhar). A API já filtra pelo cliente do token:
 * encomenda de outro cliente responde 404, então o front não precisa (nem consegue) ver as dos outros.
 */
@Injectable({ providedIn: 'root' })
export class EncomendasApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.api}/encomendas`;

  listar(f: { status?: StatusCarga | null; page?: number; size?: number } = {}) {
    return this.http.get<Pagina<EncomendaResumo>>(this.url, { params: parametros({ ...f }) });
  }

  /** Detalhe com rota, posição do veículo (rua/bairro), previsão e linha do tempo. */
  buscar(codigo: string) {
    return this.http.get<Encomenda>(`${this.url}/${encodeURIComponent(codigo)}`);
  }
}

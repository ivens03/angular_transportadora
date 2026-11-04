import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LotePosicoesResposta, NovaPosicao, Pagina, Posicao, Rota, RotaResumo, StatusParada, StatusRota } from '../modelos';
import { MERGE_PATCH, parametros } from './consulta';

export interface NovaRota {
  veiculoId: number;
  entregadorMatricula: string;
  cargaIds: number[];
  origemLatitude?: number | null;
  origemLongitude?: number | null;
  retornarAOrigem?: boolean;
}

/**
 * O mesmo recurso /rotas atende o painel (Suporte gera/cancela/acompanha)
 * e o app (o entregador vê só as dele, inicia, baixa paradas e manda GPS).
 */
@Injectable({ providedIn: 'root' })
export class RotasApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.api}/rotas`;

  listar(f: { status?: StatusRota | null; page?: number; size?: number; sort?: string } = {}) {
    return this.http.get<Pagina<RotaResumo>>(this.url, { params: parametros({ ...f }) });
  }

  buscar(id: number) {
    return this.http.get<Rota>(`${this.url}/${id}`);
  }

  gerar(rota: NovaRota) {
    return this.http.post<Rota>(this.url, rota);
  }

  /** EM_ANDAMENTO = iniciar (entregador); CANCELADA = cancelar (Suporte, só PLANEJADA). */
  mudarStatus(id: number, status: StatusRota) {
    return this.http.patch<Rota>(`${this.url}/${id}`, { status }, MERGE_PATCH);
  }

  baixarParada(id: number, ordem: number, status: Exclude<StatusParada, 'PENDENTE'>, motivo?: string | null) {
    return this.http.patch<Rota>(`${this.url}/${id}/paradas/${ordem}`,
      { status, motivo: motivo ?? null, finalizadaEm: new Date().toISOString() }, MERGE_PATCH);
  }

  enviarPosicoes(id: number, posicoes: NovaPosicao[]) {
    return this.http.post<LotePosicoesResposta>(`${this.url}/${id}/posicoes`, { posicoes });
  }

  posicoes(id: number, desde?: string | null) {
    return this.http.get<Posicao[]>(`${this.url}/${id}/posicoes`, { params: parametros({ desde }) });
  }
}

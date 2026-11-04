import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Abastecimento, Combustivel, MetricaConsumo, MetricaFrota, Pagina, StatusVeiculo, TipoVeiculo, Veiculo } from '../modelos';
import { MERGE_PATCH, parametros } from './consulta';

export type VeiculoForm = Pick<Veiculo, 'placa' | 'renavam' | 'marca' | 'modelo' | 'anoFabricacao' | 'tipo' | 'combustivel'
  | 'capacidadeCargaKg' | 'capacidadeVolumeM3' | 'consumoReferenciaKmPorLitro' | 'quilometragemAtual'>;

export type VeiculoPatch = Partial<Pick<Veiculo, 'placa' | 'marca' | 'modelo' | 'capacidadeCargaKg' | 'capacidadeVolumeM3'
  | 'consumoReferenciaKmPorLitro' | 'quilometragemAtual' | 'status'>>;

export interface NovoAbastecimento {
  dataHora: string;
  odometroKm: number;
  litros: number;
  valorTotal?: number | null;
  combustivel: Combustivel;
  posto?: string | null;
}

@Injectable({ providedIn: 'root' })
export class VeiculosApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.api}/veiculos`;

  listar(f: { status?: StatusVeiculo | null; tipo?: TipoVeiculo | null; page?: number; size?: number; sort?: string } = {}) {
    return this.http.get<Pagina<Veiculo>>(this.url, { params: parametros({ ...f }) });
  }

  buscar(id: number) {
    return this.http.get<Veiculo>(`${this.url}/${id}`);
  }

  cadastrar(v: VeiculoForm) {
    return this.http.post<Veiculo>(this.url, v);
  }

  atualizar(id: number, mudancas: VeiculoPatch) {
    return this.http.patch<Veiculo>(`${this.url}/${id}`, mudancas, MERGE_PATCH);
  }

  abastecimentos(veiculoId: number, page = 0, size = 20) {
    return this.http.get<Pagina<Abastecimento>>(`${this.url}/${veiculoId}/abastecimentos`,
      { params: parametros({ page, size, sort: 'dataHora,desc' }) });
  }

  abastecer(veiculoId: number, a: NovoAbastecimento) {
    return this.http.post<Abastecimento>(`${this.url}/${veiculoId}/abastecimentos`, a);
  }

  metricaVeiculo(veiculoId: number, inicio?: string | null, fim?: string | null) {
    return this.http.get<MetricaConsumo>(`${this.url}/${veiculoId}/metricas-consumo`, { params: parametros({ inicio, fim }) });
  }

  metricaFrota(inicio?: string | null, fim?: string | null) {
    return this.http.get<MetricaFrota>(`${environment.api}/metricas-consumo`, { params: parametros({ inicio, fim }) });
  }
}

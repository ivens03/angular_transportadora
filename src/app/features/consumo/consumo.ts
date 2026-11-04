import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VeiculosApi } from '../../core/api/veiculos.api';
import { erroApi } from '../../core/erro';
import { hojeIso } from '../../core/geo';
import { MetricaConsumo, MetricaFrota } from '../../core/modelos';
import { TIPOS_VEICULO } from '../../core/rotulos';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Vazio } from '../../shared/vazio';

const ORDEM_SITUACAO: Record<string, number> = { CONSUMO_ACIMA_DO_ESPERADO: 0, DENTRO_DO_ESPERADO: 1, SEM_REFERENCIA: 2, DADOS_INSUFICIENTES: 3 };

/** Financeiro: consumo da frota no período (km/l, R$/km) e quem está gastando acima da referência. */
@Component({
  selector: 'app-consumo',
  imports: [FormsModule, RouterLink, DecimalPipe, CurrencyPipe, DatePipe, EtiquetaStatus, Vazio],
  templateUrl: './consumo.html',
  styleUrl: './consumo.scss',
})
export class Consumo {
  private readonly api = inject(VeiculosApi);
  protected readonly tipos = TIPOS_VEICULO;

  protected readonly atalhos = [7, 30, 90];
  protected readonly dias = signal<number | null>(30);
  protected inicio = hojeIso(-30);
  protected fim = hojeIso();
  protected readonly dados = signal<MetricaFrota | null>(null);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly veiculos = computed(() => [...(this.dados()?.veiculos ?? [])]
    .sort((a, b) => (ORDEM_SITUACAO[a.situacao] ?? 9) - (ORDEM_SITUACAO[b.situacao] ?? 9) || a.placa.localeCompare(b.placa)));

  constructor() { this.carregar(); }

  protected periodo(d: number): void {
    this.dias.set(d);
    this.inicio = hojeIso(-d);
    this.fim = hojeIso();
    this.carregar();
  }

  protected personalizado(): void {
    this.dias.set(null);
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.metricaFrota(this.inicio, this.fim).subscribe({
      next: d => { this.dados.set(d); this.carregando.set(false); },
      error: e => { this.erro.set(erroApi(e).mensagem); this.carregando.set(false); },
    });
  }

  /** Largura da barra km/l real × referência (a referência fica em 80% da trilha). */
  protected barra(m: MetricaConsumo): number {
    if (!m.consumoMedioKmPorLitro || !m.consumoReferenciaKmPorLitro) return 0;
    return Math.min(100, (m.consumoMedioKmPorLitro / m.consumoReferenciaKmPorLitro) * 80);
  }
}

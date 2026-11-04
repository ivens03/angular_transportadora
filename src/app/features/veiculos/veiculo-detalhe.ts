import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VeiculosApi } from '../../core/api/veiculos.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { AvisoService } from '../../core/aviso.service';
import { erroApi } from '../../core/erro';
import { hojeIso } from '../../core/geo';
import { Abastecimento, Combustivel, MetricaConsumo, Pagina, Permissao, Veiculo } from '../../core/modelos';
import { COMBUSTIVEIS, TIPOS_VEICULO } from '../../core/rotulos';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Folha } from '../../shared/folha';
import { Paginacao } from '../../shared/paginacao';
import { Vazio } from '../../shared/vazio';

/** Ficha do veículo: dados, consumo dos últimos 30 dias (Financeiro) e abastecimentos. */
@Component({
  selector: 'app-veiculo-detalhe',
  imports: [RouterLink, ReactiveFormsModule, DecimalPipe, DatePipe, CurrencyPipe, EtiquetaStatus, Folha, Paginacao, Vazio],
  templateUrl: './veiculo-detalhe.html',
})
export class VeiculoDetalhe implements OnInit {
  private readonly api = inject(VeiculosApi);
  private readonly avisos = inject(AvisoService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly veMetricas = inject(SessaoService).tem(Permissao.CONSUMO_VER_METRICAS);

  readonly id = input.required<string>();

  protected readonly veiculo = signal<Veiculo | null>(null);
  protected readonly abastecimentos = signal<Pagina<Abastecimento> | null>(null);
  protected readonly metrica = signal<MetricaConsumo | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly folha = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erroForm = signal<string | null>(null);
  protected readonly tipos = TIPOS_VEICULO;
  protected readonly nomesCombustivel = COMBUSTIVEIS;

  /** Flex abastece gasolina OU etanol; os outros, só o próprio combustível. */
  protected readonly opcoesCombustivel = computed<Combustivel[]>(() => {
    const c = this.veiculo()?.combustivel;
    return c === 'FLEX' ? ['GASOLINA', 'ETANOL'] : c ? [c] : [];
  });

  protected readonly form = this.fb.group({
    dataHora: [agoraLocal(), Validators.required],
    odometroKm: [null as number | null, [Validators.required, Validators.min(0)]],
    litros: [null as number | null, [Validators.required, Validators.min(0.001)]],
    valorTotal: [null as number | null, Validators.min(0.01)],
    combustivel: ['GASOLINA' as Combustivel, Validators.required],
    posto: [''],
  });

  ngOnInit(): void {
    const id = Number(this.id());
    this.api.buscar(id).subscribe({ next: v => this.veiculo.set(v), error: e => this.erro.set(erroApi(e).mensagem) });
    this.carregarAbastecimentos(0);
    this.carregarMetrica();
  }

  protected carregarAbastecimentos(page: number): void {
    this.api.abastecimentos(Number(this.id()), page, 10).subscribe(p => this.abastecimentos.set(p));
  }

  private carregarMetrica(): void {
    if (this.veMetricas) this.api.metricaVeiculo(Number(this.id()), hojeIso(-30), hojeIso()).subscribe(m => this.metrica.set(m));
  }

  protected abrir(): void {
    const v = this.veiculo();
    this.form.reset({ dataHora: agoraLocal(), odometroKm: v?.quilometragemAtual ?? null, litros: null, valorTotal: null,
      combustivel: this.opcoesCombustivel()[0] ?? 'GASOLINA', posto: '' });
    this.erroForm.set(null);
    this.folha.set(true);
  }

  protected registrar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.erroForm.set('Informe data, odômetro e litros.'); return; }
    const v = this.form.getRawValue();
    this.salvando.set(true);
    this.api.abastecer(Number(this.id()), {
      dataHora: new Date(v.dataHora).toISOString(),
      odometroKm: Number(v.odometroKm),
      litros: Number(v.litros),
      valorTotal: v.valorTotal ? Number(v.valorTotal) : null,
      combustivel: v.combustivel,
      posto: v.posto.trim() || null,
    }).subscribe({
      next: () => {
        this.salvando.set(false);
        this.folha.set(false);
        this.avisos.sucesso('Abastecimento registrado.');
        this.ngOnInit();
      },
      error: e => { this.salvando.set(false); this.erroForm.set(erroApi(e).mensagem); },
    });
  }
}

/** "yyyy-MM-ddTHH:mm" no fuso do aparelho, para o <input type="datetime-local">. */
function agoraLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

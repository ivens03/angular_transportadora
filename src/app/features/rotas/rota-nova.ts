import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CargasApi } from '../../core/api/cargas.api';
import { RotasApi } from '../../core/api/rotas.api';
import { UsuariosApi } from '../../core/api/usuarios.api';
import { VeiculosApi } from '../../core/api/veiculos.api';
import { AvisoService } from '../../core/aviso.service';
import { erroApi } from '../../core/erro';
import { Carga, Entregador, Parada, Veiculo } from '../../core/modelos';
import { TIPOS_VEICULO } from '../../core/rotulos';
import { MapaRota } from '../../shared/mapa/mapa-rota';
import { Vazio } from '../../shared/vazio';

type Passo = 1 | 2 | 3;

/**
 * Montagem de rota em 3 passos (o celular mostra um passo por vez):
 *  1. cargas que aguardam rota  2. veículo (com folga de capacidade) e entregador  3. revisar e gerar.
 * A ordem das paradas quem decide é o back-end (vizinho mais próximo + 2-opt).
 */
@Component({
  selector: 'app-rota-nova',
  imports: [RouterLink, FormsModule, DecimalPipe, MapaRota, Vazio],
  templateUrl: './rota-nova.html',
  styleUrl: './rota-nova.scss',
})
export class RotaNova {
  private readonly cargasApi = inject(CargasApi);
  private readonly veiculosApi = inject(VeiculosApi);
  private readonly usuariosApi = inject(UsuariosApi);
  private readonly rotasApi = inject(RotasApi);
  private readonly avisos = inject(AvisoService);
  private readonly router = inject(Router);

  protected readonly passo = signal<Passo>(1);
  protected readonly cargas = signal<Carga[] | null>(null);
  protected readonly veiculos = signal<Veiculo[] | null>(null);
  protected readonly entregadores = signal<Entregador[] | null>(null);
  protected readonly selecionadas = signal<Set<number>>(new Set());
  protected readonly veiculoId = signal<number | null>(null);
  protected readonly entregador = signal<string | null>(null);
  protected readonly retornar = signal(true);
  protected readonly gerando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly filtroBairro = signal('');
  protected readonly filtroEntregador = signal('');
  protected readonly tipos = TIPOS_VEICULO;

  protected readonly cargasVisiveis = computed(() => {
    const f = this.filtroBairro().trim().toLowerCase();
    return (this.cargas() ?? []).filter(c => !f || c.bairro.toLowerCase().includes(f) || c.destinatarioNome.toLowerCase().includes(f));
  });
  protected readonly escolhidas = computed(() => (this.cargas() ?? []).filter(c => this.selecionadas().has(c.id)));
  protected readonly peso = computed(() => this.escolhidas().reduce((s, c) => s + c.pesoKg, 0));
  protected readonly volume = computed(() => this.escolhidas().reduce((s, c) => s + c.volumeM3, 0));
  protected readonly veiculo = computed(() => this.veiculos()?.find(v => v.id === this.veiculoId()) ?? null);
  protected readonly entregadorEscolhido = computed(() => this.entregadores()?.find(e => e.matricula === this.entregador()) ?? null);
  protected readonly entregadoresVisiveis = computed(() => {
    const f = this.filtroEntregador().trim().toLowerCase();
    return (this.entregadores() ?? []).filter(e => !f || e.nome.toLowerCase().includes(f) || e.matricula.toLowerCase().includes(f));
  });
  /** As cargas escolhidas como "paradas" provisórias só para aparecerem no mapa. */
  protected readonly pinos = computed<Parada[]>(() => this.escolhidas().map((c, i) => ({
    ordem: i + 1, cargaId: c.id, cargaCodigo: c.codigo, descricao: c.descricao, pesoKg: c.pesoKg,
    destinatarioNome: c.destinatarioNome, destinatarioTelefone: c.destinatarioTelefone, endereco: c.endereco,
    bairro: c.bairro, cidade: c.cidade, uf: c.uf, latitude: c.latitude, longitude: c.longitude,
    distanciaDoAnteriorKm: 0, status: 'PENDENTE', motivo: null, finalizadaEm: null,
  })));
  protected readonly podeAvancar = computed(() => this.passo() === 1 ? this.selecionadas().size > 0
    : this.passo() === 2 ? !!this.veiculoId() && !!this.entregador() && this.cabe(this.veiculo()) : true);

  constructor() {
    this.cargasApi.listar({ status: 'AGUARDANDO_ROTA', size: 100, sort: 'bairro,asc' }).subscribe({
      next: p => this.cargas.set(p.content), error: e => this.erro.set(erroApi(e).mensagem),
    });
    this.veiculosApi.listar({ status: 'ATIVO', size: 100, sort: 'placa,asc' }).subscribe({
      next: p => this.veiculos.set(p.content), error: e => this.erro.set(erroApi(e).mensagem),
    });
    this.usuariosApi.entregadores('ATIVO').subscribe({
      next: p => this.entregadores.set(p.content), error: e => this.erro.set(erroApi(e).mensagem),
    });
  }

  protected alternar(id: number): void {
    this.selecionadas.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  protected todasVisiveis(): void {
    const visiveis = this.cargasVisiveis();
    const todas = visiveis.every(c => this.selecionadas().has(c.id));
    this.selecionadas.update(s => { const n = new Set(s); visiveis.forEach(c => todas ? n.delete(c.id) : n.add(c.id)); return n; });
  }

  protected uso(capacidade: number, usado: number): number {
    return capacidade ? Math.min(100, Math.round(usado * 100 / capacidade)) : 0;
  }

  protected cabe(v: Veiculo | null): boolean {
    return !!v && this.peso() <= v.capacidadeCargaKg && this.volume() <= v.capacidadeVolumeM3;
  }

  protected avancar(): void {
    if (!this.podeAvancar()) return;
    if (this.passo() < 3) { this.passo.update(p => (p + 1) as Passo); window.scrollTo({ top: 0 }); return; }
    this.gerar();
  }

  protected voltar(): void {
    if (this.passo() > 1) this.passo.update(p => (p - 1) as Passo);
  }

  private gerar(): void {
    this.gerando.set(true);
    this.erro.set(null);
    this.rotasApi.gerar({
      veiculoId: this.veiculoId()!,
      entregadorMatricula: this.entregador()!,
      cargaIds: [...this.selecionadas()],
      retornarAOrigem: this.retornar(),
    }).subscribe({
      next: r => {
        this.avisos.sucesso(`Rota ${r.codigo} gerada: ${r.paradas.length} paradas, ${r.distanciaEstimadaKm} km.`);
        this.router.navigate(['/painel/rotas', r.id]);
      },
      error: e => { this.gerando.set(false); this.erro.set(erroApi(e).mensagem); },
    });
  }
}

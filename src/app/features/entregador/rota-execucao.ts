import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { RotasApi } from '../../core/api/rotas.api';
import { AvisoService } from '../../core/aviso.service';
import { erroApi } from '../../core/erro';
import { linkNavegacao } from '../../core/geo';
import { Parada, Ponto, Rota } from '../../core/modelos';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Folha } from '../../shared/folha';
import { MapaRota } from '../../shared/mapa/mapa-rota';
import { Rastreador } from './rastreador.service';

const MOTIVOS = ['Destinatário ausente', 'Endereço não localizado', 'Recusado pelo destinatário', 'Estabelecimento fechado', 'Outro'];

/**
 * Tela principal do entregador: mapa no topo, "próxima entrega" logo abaixo
 * (botões grandes para o polegar) e a lista completa das paradas.
 */
@Component({
  selector: 'app-rota-execucao',
  imports: [RouterLink, DecimalPipe, DatePipe, FormsModule, MapaRota, EtiquetaStatus, Folha],
  templateUrl: './rota-execucao.html',
  styleUrl: './rota-execucao.scss',
})
export class RotaExecucao implements OnInit {
  private readonly api = inject(RotasApi);
  private readonly avisos = inject(AvisoService);
  protected readonly rastreador = inject(Rastreador);

  /** :id da URL. */
  readonly id = input.required<string>();

  protected readonly rota = signal<Rota | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly ocupado = signal<string | null>(null);
  protected readonly percursoServidor = signal<Ponto[]>([]);
  protected readonly verTodas = signal(false);

  protected readonly folhaFalha = signal(false);
  protected readonly motivos = MOTIVOS;
  protected motivoEscolhido = '';
  protected motivoTexto = '';

  protected readonly simulador = environment.simuladorGps;

  protected readonly proxima = computed(() => {
    const r = this.rota();
    return r?.paradas.find(p => p.ordem === r.proximaParada) ?? null;
  });
  protected readonly origem = computed<Ponto | null>(() => {
    const r = this.rota();
    return r ? { latitude: r.origemLatitude, longitude: r.origemLongitude } : null;
  });
  private readonly rastreandoEsta = computed(() => this.rastreador.rotaAtual() === this.rota()?.id);
  protected readonly percurso = computed(() =>
    this.rastreandoEsta() ? [...this.percursoServidor(), ...this.rastreador.trilha()] : this.percursoServidor());
  protected readonly atual = computed<Ponto | null>(() =>
    (this.rastreandoEsta() ? this.rastreador.atual() : null) ?? this.rota()?.ultimaPosicao ?? null);

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.erro.set(null);
    const id = Number(this.id());
    this.api.buscar(id).subscribe({
      next: r => {
        this.rota.set(r);
        if (r.status === 'EM_ANDAMENTO') this.rastreador.iniciar(r.id);
        if (r.iniciadaEm) {
          this.api.posicoes(r.id).subscribe(ps => this.percursoServidor.set(ps.map(p => ({ latitude: p.latitude, longitude: p.longitude }))));
        }
      },
      error: e => this.erro.set(erroApi(e).mensagem),
    });
  }

  protected iniciar(): void {
    const r = this.rota();
    if (!r) return;
    this.ocupado.set('iniciar');
    this.api.mudarStatus(r.id, 'EM_ANDAMENTO').subscribe({
      next: atualizada => {
        this.ocupado.set(null);
        this.rota.set(atualizada);
        this.rastreador.iniciar(atualizada.id);
        this.avisos.sucesso('Rota iniciada. Boa viagem!');
      },
      error: e => { this.ocupado.set(null); this.avisos.erro(erroApi(e).mensagem); },
    });
  }

  protected entregue(p: Parada): void {
    this.baixar(p, 'ENTREGUE', null);
  }

  protected abrirFalha(): void {
    this.motivoEscolhido = '';
    this.motivoTexto = '';
    this.folhaFalha.set(true);
  }

  protected confirmarFalha(): void {
    const p = this.proxima();
    const motivo = this.motivoEscolhido === 'Outro' ? this.motivoTexto.trim() : this.motivoEscolhido;
    if (!p || !motivo) return;
    this.folhaFalha.set(false);
    this.baixar(p, 'NAO_ENTREGUE', motivo);
  }

  private baixar(p: Parada, status: 'ENTREGUE' | 'NAO_ENTREGUE', motivo: string | null): void {
    const r = this.rota();
    if (!r) return;
    this.ocupado.set(status);
    this.rastreador.enviar(); // a posição do momento da baixa vai junto
    this.api.baixarParada(r.id, p.ordem, status, motivo).subscribe({
      next: atualizada => {
        this.ocupado.set(null);
        this.rota.set(atualizada);
        if (atualizada.status === 'CONCLUIDA') {
          this.rastreador.parar();
          this.avisos.sucesso('Rota concluída! 🎉');
        } else {
          this.avisos.sucesso(status === 'ENTREGUE' ? `Entrega ${p.ordem} confirmada.` : `Parada ${p.ordem} registrada como não entregue.`);
        }
        if ('vibrate' in navigator) navigator.vibrate(60);
      },
      error: e => { this.ocupado.set(null); this.avisos.erro(erroApi(e).mensagem); },
    });
  }

  protected simular(): void {
    const r = this.rota();
    if (!r) return;
    if (this.rastreador.simulando()) { this.rastreador.pararSimulacao(); return; }
    // segura o "carro" na próxima parada até o entregador dar baixa
    this.rastreador.simular(r.trajeto, () => {
      const p = this.proxima();
      return p ? [{ latitude: p.latitude, longitude: p.longitude }] : [];
    });
  }

  protected navegar(p: Parada): string { return linkNavegacao(p.latitude, p.longitude); }
}

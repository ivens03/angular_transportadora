import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { RotasApi } from '../../core/api/rotas.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { AvisoService } from '../../core/aviso.service';
import { erroApi } from '../../core/erro';
import { Permissao, Ponto, Rota } from '../../core/modelos';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { MapaRota } from '../../shared/mapa/mapa-rota';

/**
 * Acompanhamento ao vivo (Suporte). Enquanto a rota está ativa, de tempos em tempos busca
 * a rota (progresso/última posição) e só as posições NOVAS (GET /posicoes?desde=...).
 * Para de consultar quando a aba fica oculta, para não gastar bateria/dados à toa.
 */
@Component({
  selector: 'app-rota-acompanhar',
  imports: [RouterLink, DatePipe, DecimalPipe, MapaRota, EtiquetaStatus],
  templateUrl: './rota-acompanhar.html',
  styleUrl: './rota-acompanhar.scss',
})
export class RotaAcompanhar implements OnInit, OnDestroy {
  private readonly api = inject(RotasApi);
  private readonly avisos = inject(AvisoService);
  protected readonly podeCancelar = inject(SessaoService).tem(Permissao.ENTREGA_CADASTRAR);

  readonly id = input.required<string>();

  protected readonly rota = signal<Rota | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly percurso = signal<Ponto[]>([]);
  protected readonly agora = signal(Date.now());
  protected readonly confirmar = signal(false);
  private ultimaLeitura: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly aoMudarVisibilidade = () => { if (!document.hidden) this.atualizar(); };

  protected readonly origem = computed<Ponto | null>(() => {
    const r = this.rota();
    return r ? { latitude: r.origemLatitude, longitude: r.origemLongitude } : null;
  });
  protected readonly proxima = computed(() => {
    const r = this.rota();
    return r?.paradas.find(p => p.ordem === r.proximaParada) ?? null;
  });
  protected readonly ativa = computed(() => this.rota()?.status === 'PLANEJADA' || this.rota()?.status === 'EM_ANDAMENTO');
  /** "há 12 s" — quanto tempo desde o último ponto de GPS. */
  protected readonly atraso = computed(() => {
    const u = this.rota()?.ultimaPosicao?.registradaEm;
    if (!u) return null;
    const s = Math.max(0, Math.round((this.agora() - Date.parse(u)) / 1000));
    return s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`;
  });
  protected readonly semSinal = computed(() => {
    const u = this.rota()?.ultimaPosicao?.registradaEm;
    return this.rota()?.status === 'EM_ANDAMENTO' && (!u || this.agora() - Date.parse(u) > 3 * 60_000);
  });

  ngOnInit(): void {
    this.atualizar();
    this.timer = setInterval(() => {
      this.agora.set(Date.now());
      if (!document.hidden && this.ativa()) this.atualizar();
    }, environment.acompanhamentoMs);
    document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
  }

  protected atualizar(): void {
    const id = Number(this.id());
    this.api.buscar(id).subscribe({
      next: r => { this.rota.set(r); this.erro.set(null); },
      error: e => this.erro.set(erroApi(e).mensagem),
    });
    this.api.posicoes(id, this.ultimaLeitura).subscribe(novas => {
      if (!novas.length) return;
      // ?desde= é inclusivo: descarta o ponto que já tínhamos
      const filtradas = novas.filter(p => p.registradaEm !== this.ultimaLeitura);
      this.ultimaLeitura = novas[novas.length - 1].registradaEm;
      this.percurso.update(atual => [...atual, ...filtradas.map(p => ({ latitude: p.latitude, longitude: p.longitude }))]);
    });
  }

  protected cancelar(): void {
    const r = this.rota();
    if (!r) return;
    this.confirmar.set(false);
    this.api.mudarStatus(r.id, 'CANCELADA').subscribe({
      next: atualizada => { this.rota.set(atualizada); this.avisos.sucesso(`Rota ${r.codigo} cancelada. As cargas voltaram para a fila.`); },
      error: e => this.avisos.erro(erroApi(e).mensagem),
    });
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { RotasApi } from '../../core/api/rotas.api';
import { NovaPosicao, Ponto } from '../../core/modelos';
import { distanciaM } from '../../core/geo';

const CHAVE_FILA = 'rotacerta.gps.fila';
const MAX_LOTE = 500; // limite do back-end (rotacerta.rota.max-posicoes-por-lote)
const BATIMENTO_MS = 30_000; // parado no sinal: ainda manda um ponto a cada 30 s

/**
 * GPS do entregador. Lê o navigator.geolocation, descarta leituras redundantes,
 * guarda numa fila no localStorage (sobrevive a recarregar/ficar sem sinal) e
 * envia em LOTE para POST /rotas/{id}/posicoes. Reenvio é seguro: o back-end
 * ignora (rota, registradaEm) repetidos.
 */
@Injectable({ providedIn: 'root' })
export class Rastreador {
  private readonly api = inject(RotasApi);

  readonly ativo = signal(false);
  readonly erro = signal<string | null>(null);
  /** Posição mais recente (atualiza o marcador na hora, antes de ir para o servidor). */
  readonly atual = signal<Ponto | null>(null);
  /** Pontos aceitos nesta sessão (desenha o percurso sem esperar o servidor). */
  readonly trilha = signal<Ponto[]>([]);
  readonly pendentes = signal(0);
  readonly ultimoEnvio = signal<Date | null>(null);
  readonly simulando = signal(false);

  private rotaId: number | null = null;
  private fila: NovaPosicao[] = [];
  private ultimoAceito: NovaPosicao | null = null;
  private watchId: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private simTimer: ReturnType<typeof setInterval> | null = null;
  private enviando = false;
  private readonly aoVoltarRede = () => this.enviar();

  rotaAtual(): number | null { return this.ativo() ? this.rotaId : null; }

  iniciar(rotaId: number): void {
    if (this.ativo() && this.rotaId === rotaId) return;
    this.parar();
    this.rotaId = rotaId;
    this.fila = lerFila(rotaId);
    this.pendentes.set(this.fila.length);
    this.trilha.set([]);
    this.ativo.set(true);
    this.erro.set(null);
    this.ligarGps();
    this.timer = setInterval(() => this.enviar(), environment.gps.intervaloEnvioMs);
    window.addEventListener('online', this.aoVoltarRede);
  }

  /** Para tudo, tentando mandar o que sobrou na fila. */
  parar(): void {
    this.enviar();
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    if (this.timer) clearInterval(this.timer);
    this.pararSimulacao();
    window.removeEventListener('online', this.aoVoltarRede);
    this.watchId = null;
    this.timer = null;
    this.ultimoAceito = null;
    this.ativo.set(false);
  }

  /**
   * Só para demonstração (environment.simuladorGps): percorre o trajeto planejado
   * ~50 m por segundo e espera em cada parada até ela ser baixada.
   */
  simular(trajeto: Ponto[], aguardarEm: () => Ponto[]): void {
    if (!this.ativo() || trajeto.length < 2) return;
    if (this.watchId !== null) { navigator.geolocation.clearWatch(this.watchId); this.watchId = null; }
    const caminho = interpolar(trajeto, 50);
    let i = 0;
    const a = this.atual();
    if (a) { // continua de onde o "carro" está
      let melhor = Infinity;
      caminho.forEach((p, k) => { const d = distanciaM(a.latitude, a.longitude, p.latitude, p.longitude); if (d < melhor) { melhor = d; i = k; } });
    }
    this.simulando.set(true);
    this.erro.set(null);
    this.simTimer = setInterval(() => {
      const p = caminho[i];
      if (!p) { this.pararSimulacao(); return; }
      this.receber({ latitude: p.latitude, longitude: p.longitude, registradaEm: new Date().toISOString(), velocidadeKmH: 32.4, precisaoM: 5 });
      const segurar = aguardarEm().some(q => distanciaM(q.latitude, q.longitude, p.latitude, p.longitude) < 30);
      if (!segurar) i++;
    }, 1000);
  }

  pararSimulacao(): void {
    if (this.simTimer) clearInterval(this.simTimer);
    this.simTimer = null;
    if (this.simulando()) {
      this.simulando.set(false);
      if (this.ativo()) this.ligarGps();
    }
  }

  enviar(): void {
    const rotaId = this.rotaId;
    if (this.enviando || rotaId === null || this.fila.length === 0) return;
    this.enviando = true;
    const lote = this.fila.slice(0, MAX_LOTE);
    this.api.enviarPosicoes(rotaId, lote).subscribe({
      next: () => {
        this.fila = this.fila.slice(lote.length);
        this.depoisDeEnviar(rotaId);
        this.ultimoEnvio.set(new Date());
        if (this.fila.length) queueMicrotask(() => this.enviar());
      },
      error: (e: unknown) => {
        // 404/422: a rota não aceita mais posição (concluída/cancelada) → descarta a fila
        if (e instanceof HttpErrorResponse && (e.status === 404 || e.status === 422)) {
          this.fila = [];
          this.depoisDeEnviar(rotaId);
        }
        this.enviando = false;
      },
    });
  }

  private depoisDeEnviar(rotaId: number) {
    this.enviando = false;
    gravarFila(rotaId, this.fila);
    this.pendentes.set(this.fila.length);
  }

  private ligarGps(): void {
    if (!('geolocation' in navigator)) {
      this.erro.set('Este aparelho não tem GPS disponível no navegador.');
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        this.erro.set(null);
        this.receber({
          latitude: +pos.coords.latitude.toFixed(6),
          longitude: +pos.coords.longitude.toFixed(6),
          registradaEm: new Date(pos.timestamp).toISOString(),
          velocidadeKmH: pos.coords.speed !== null && pos.coords.speed >= 0 ? +(pos.coords.speed * 3.6).toFixed(1) : null,
          precisaoM: +Math.min(pos.coords.accuracy, 99_999).toFixed(1),
        });
      },
      err => this.erro.set(err.code === err.PERMISSION_DENIED
        ? 'Permita o acesso à localização para o Suporte acompanhar a rota.'
        : 'Sem sinal de GPS no momento.'),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    );
  }

  private receber(p: NovaPosicao): void {
    this.atual.set({ latitude: p.latitude, longitude: p.longitude });
    const u = this.ultimoAceito;
    if (u) {
      const dt = Date.parse(p.registradaEm) - Date.parse(u.registradaEm);
      const dist = distanciaM(u.latitude, u.longitude, p.latitude, p.longitude);
      if (dt < environment.gps.intervaloMinimoMs) return;
      if (dist < environment.gps.distanciaMinimaM && dt < BATIMENTO_MS) return;
    }
    this.ultimoAceito = p;
    this.fila.push(p);
    this.trilha.update(t => [...t, { latitude: p.latitude, longitude: p.longitude }]);
    this.pendentes.set(this.fila.length);
    if (this.rotaId !== null) gravarFila(this.rotaId, this.fila);
  }
}

function lerFila(rotaId: number): NovaPosicao[] {
  try { return JSON.parse(localStorage.getItem(`${CHAVE_FILA}.${rotaId}`) ?? '[]') as NovaPosicao[]; } catch { return []; }
}

function gravarFila(rotaId: number, fila: NovaPosicao[]) {
  try {
    if (fila.length) localStorage.setItem(`${CHAVE_FILA}.${rotaId}`, JSON.stringify(fila.slice(-5_000)));
    else localStorage.removeItem(`${CHAVE_FILA}.${rotaId}`);
  } catch { /* armazenamento cheio/bloqueado: segue só em memória */ }
}

/** Quebra o trajeto em passos de ~passoM metros (linha reta entre os pontos). */
function interpolar(pts: Ponto[], passoM: number): Ponto[] {
  const saida: Ponto[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const n = Math.max(1, Math.round(distanciaM(a.latitude, a.longitude, b.latitude, b.longitude) / passoM));
    for (let j = 0; j < n; j++) {
      saida.push({ latitude: +(a.latitude + (b.latitude - a.latitude) * j / n).toFixed(6), longitude: +(a.longitude + (b.longitude - a.longitude) * j / n).toFixed(6) });
    }
  }
  saida.push(pts[pts.length - 1]);
  return saida;
}

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AutenticacaoApi } from '../../core/api/autenticacao.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { erroApi } from '../../core/erro';

interface Checagem { quando: Date; ok: boolean; ms: number; detalhe: string; }

/**
 * Perfil DESENVOLVIMENTO. A API ainda não expõe mensageria nem logs de dispositivo;
 * por enquanto a tela mede a saúde/latência da API e aponta para a documentação.
 */
@Component({
  selector: 'app-monitoramento',
  imports: [DatePipe],
  template: `
    <div class="conteudo pilha-g">
      <div class="cabecalho-pagina">
        <div><h1>Monitoramento técnico</h1><p>Saúde da API e documentação.</p></div>
        <div class="acoes"><button class="btn btn-secundario" (click)="checar()"><span class="icone">refresh</span> Checar agora</button></div>
      </div>

      <div class="grade md-3">
        <div class="card kpi">
          <span class="rotulo">API</span>
          @if (ultima(); as c) {
            <span class="valor" [class.verde]="c.ok" [class.vermelho]="!c.ok">{{ c.ok ? 'No ar' : 'Fora' }}</span>
            <span class="pequeno texto-2">{{ c.detalhe }}</span>
          } @else { <span class="valor">…</span> }
        </div>
        <div class="card kpi">
          <span class="rotulo">Latência (GET /auth/sessao)</span>
          <span class="valor">{{ ultima()?.ms ?? '–' }}<small>ms</small></span>
        </div>
        <div class="card kpi">
          <span class="rotulo">Ambiente</span>
          <span class="valor" style="font-size:20px">{{ ambiente.producao ? 'Produção' : 'Desenvolvimento' }}</span>
          <span class="pequeno texto-2">{{ ambiente.api }}</span>
        </div>
      </div>

      <div class="card">
        <h2 class="card-titulo">Últimas checagens</h2>
        <ul class="lista">
          @for (c of historico(); track c.quando) {
            <li class="linha-entre" style="padding:8px 0">
              <span class="linha"><span class="icone" [class.verde]="c.ok" [class.vermelho]="!c.ok">{{ c.ok ? 'check_circle' : 'error' }}</span>{{ c.quando | date: 'HH:mm:ss' }}</span>
              <span class="pequeno texto-2">{{ c.ms }} ms · {{ c.detalhe }}</span>
            </li>
          }
        </ul>
      </div>

      <div class="card pilha">
        <h2 class="card-titulo" style="margin:0">Documentação da API</h2>
        <a class="btn btn-secundario" [href]="ambiente.swagger" target="_blank" rel="noopener"><span class="icone">api</span> Abrir Swagger UI</a>
        <div class="aviso"><span class="icone">info</span>Mensageria e logs de dispositivo (permissões <code>mensageria:monitorar</code> e <code>dispositivo:consultar-logs</code>) ainda não têm endpoint na API.</div>
      </div>
    </div>`,
})
export class Monitoramento {
  private readonly api = inject(AutenticacaoApi);
  protected readonly sessao = inject(SessaoService);
  protected readonly ambiente = environment;
  protected readonly historico = signal<Checagem[]>([]);
  protected readonly ultima = signal<Checagem | null>(null);

  constructor() { this.checar(); }

  protected checar(): void {
    const t0 = performance.now();
    const registrar = (ok: boolean, detalhe: string) => {
      const c = { quando: new Date(), ok, ms: Math.round(performance.now() - t0), detalhe };
      this.ultima.set(c);
      this.historico.update(h => [c, ...h].slice(0, 10));
    };
    this.api.sessao().subscribe({
      next: s => registrar(true, `token válido (${s.matricula})`),
      error: e => registrar(false, erroApi(e).mensagem),
    });
  }
}

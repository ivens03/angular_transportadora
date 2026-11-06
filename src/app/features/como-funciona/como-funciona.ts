import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Arquitetura, ArquiteturaApi, Camada, Passo, camadasDoFluxo, porCategoria, tempoNoAr } from '../../core/api/arquitetura.api';
import { erroApi } from '../../core/erro';

/** Ícone (Material Symbols) de cada caixa do desenho. */
const ICONES: Record<string, string> = {
  celular: 'smartphone', navegador: 'web', borda: 'shield_lock', api: 'dns', banco: 'database',
  externos: 'public', cliente: 'webhook', dev: 'laptop_mac', github: 'commit', vps: 'cloud',
};

/** Colunas do desenho do caminho do dado (da esquerda para a direita). Id novo no JSON cai na última. */
const COLUNAS = [
  { titulo: 'Quem usa', ids: ['celular', 'navegador'] },
  { titulo: 'Entrada', ids: ['borda'] },
  { titulo: 'Servidor', ids: ['api'] },
  { titulo: 'Dados e serviços', ids: ['banco', 'externos', 'cliente'] },
];

/**
 * Perfil DESENVOLVIMENTO: como o sistema funciona, do app à VPS. Tudo vem de GET /arquitetura — o mapa
 * (versionado na API) e o ambiente medido agora no servidor. Escolher um fluxo acende as caixas por onde o
 * dado passa; tocar num passo acende só a origem e o destino dele.
 */
@Component({
  selector: 'app-como-funciona',
  imports: [DatePipe, RouterLink],
  templateUrl: './como-funciona.html',
  styleUrl: './como-funciona.scss',
})
export class ComoFunciona implements OnInit {
  private readonly api = inject(ArquiteturaApi);

  protected readonly dados = signal<Arquitetura | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly fluxoId = signal('login');
  protected readonly passo = signal<Passo | null>(null);
  protected readonly aberta = signal<string | null>(null);

  protected readonly fluxo = computed(() => this.dados()?.fluxos.find(f => f.id === this.fluxoId()) ?? null);
  /** Caixas acesas: as do passo escolhido ou, sem passo, todas as do fluxo. */
  protected readonly acesas = computed(() => {
    const p = this.passo();
    return p ? new Set([p.de, p.para]) : camadasDoFluxo(this.fluxo());
  });
  protected readonly colunas = computed(() => {
    const uso = (this.dados()?.camadas ?? []).filter(c => c.grupo === 'uso');
    const conhecidos = new Set(COLUNAS.flatMap(c => c.ids));
    return COLUNAS.map((col, i) => ({
      titulo: col.titulo,
      camadas: [
        ...col.ids.map(id => uso.find(c => c.id === id)).filter((c): c is Camada => !!c),
        ...(i === COLUNAS.length - 1 ? uso.filter(c => !conhecidos.has(c.id)) : []),
      ],
    }));
  });
  protected readonly entrega = computed(() => (this.dados()?.camadas ?? []).filter(c => c.grupo === 'entrega'));
  protected readonly ferramentas = computed(() => porCategoria(this.dados()?.ferramentas ?? []));
  protected readonly camadaAberta = computed(() => this.dados()?.camadas.find(c => c.id === this.aberta()) ?? null);
  protected readonly noAr = computed(() => {
    const a = this.dados()?.ambiente;
    return a ? tempoNoAr(a.noArDesde, a.agora) : '';
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.erro.set(null);
    this.api.buscar().subscribe({
      next: d => this.dados.set(d),
      error: e => this.erro.set(erroApi(e).mensagem),
    });
  }

  protected escolherFluxo(id: string): void {
    this.fluxoId.set(id);
    this.passo.set(null);
  }

  protected alternarPasso(p: Passo): void {
    this.passo.set(this.passo() === p ? null : p);
  }

  protected abrir(id: string): void {
    this.aberta.set(this.aberta() === id ? null : id);
  }

  protected icone(id: string): string {
    return ICONES[id] ?? 'widgets';
  }

  protected nome(id: string): string {
    return this.dados()?.camadas.find(c => c.id === id)?.nome ?? id;
  }
}

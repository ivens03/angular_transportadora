import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AvisoService } from '../../core/aviso.service';
import { SessaoService } from '../../core/auth/sessao.service';
import { PERFIS } from '../../core/rotulos';
import { FormCredencial } from '../acesso/form-credencial';

/** Minha conta (app e painel): dados do token, troca de PIN/senha e sair. */
@Component({
  selector: 'app-conta',
  imports: [DatePipe, FormCredencial],
  template: `
    <div class="conteudo pilha-g" style="max-width:720px">
      <div class="card perfil">
        <span class="avatar">{{ iniciais() }}</span>
        <div class="cresce">
          <h1>{{ s()?.nome }}</h1>
          <p class="texto-2">{{ perfil().texto }} · {{ s()?.matricula }}</p>
          <p class="pequeno texto-2">{{ s()?.modulo }}</p>
        </div>
      </div>

      <div class="card">
        <h2 class="card-titulo">Acesso</h2>
        <dl class="dados">
          <dt>Entrada por</dt><dd>{{ sessao.ehEntregador() ? 'App (matrícula + PIN)' : 'Painel (e-mail + senha)' }}</dd>
          <dt>Sessão válida até</dt><dd>{{ s()?.expiraEm | date: 'dd/MM HH:mm' }}</dd>
          @if (sessao.diasParaVencer() !== null) {
            <dt>{{ sessao.ehEntregador() ? 'PIN' : 'Senha' }} vence em</dt>
            <dd [class.laranja]="(sessao.diasParaVencer() ?? 99) <= 5">{{ sessao.diasParaVencer() }} dia(s)</dd>
          }
        </dl>
        <hr>
        <p class="pequeno texto-2" style="margin-bottom:8px">O que você pode fazer:</p>
        <div class="linha quebra">
          @for (p of s()?.permissoes ?? []; track p) { <span class="etiqueta cinza">{{ p }}</span> }
        </div>
      </div>

      <div class="card">
        <h2 class="card-titulo">Trocar {{ sessao.ehEntregador() ? 'PIN' : 'senha' }}</h2>
        <app-form-credencial [matriculaFixa]="s()?.matricula ?? null" (trocou)="trocou()" />
      </div>

      <button class="btn btn-perigo btn-bloco" (click)="sessao.sair()"><span class="icone">logout</span> Sair</button>
    </div>`,
  styles: `
    .perfil { display: flex; gap: 16px; align-items: center; }
    .perfil h1 { font-size: 20px; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--rc-marinho); color: var(--rc-amarelo); display: grid; place-items: center; font-weight: 800; font-size: 22px; flex-shrink: 0; }
    .dados { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; margin: 0; font-size: 14px; }
    .dados dt { color: var(--rc-texto-2); }
    .dados dd { margin: 0; font-weight: 600; text-align: right; }
  `,
})
export class Conta {
  protected readonly sessao = inject(SessaoService);
  private readonly avisos = inject(AvisoService);
  protected readonly s = this.sessao.sessao;
  protected readonly perfil = computed(() => PERFIS[this.s()?.perfil ?? ''] ?? { texto: '', icone: 'person' });
  protected readonly iniciais = computed(() =>
    (this.s()?.nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase());

  protected trocou() {
    this.avisos.sucesso('Credencial trocada. Use a nova no próximo login.');
  }
}

import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsuariosApi } from '../../core/api/usuarios.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { AvisoService } from '../../core/aviso.service';
import { erroApi } from '../../core/erro';
import { CodigoAtivacao, Usuario } from '../../core/modelos';
import { PERFIS } from '../../core/rotulos';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { CodigoAtivacaoCartao } from './codigo-ativacao';

/**
 * Detalhe do usuário. Bloquear = PATCH {status: BLOQUEADO}. Desbloquear/esqueceu PIN =
 * gerar novo código (POST /codigos-ativacao), que exige nova ativação.
 */
@Component({
  selector: 'app-usuario-detalhe',
  imports: [RouterLink, ReactiveFormsModule, DatePipe, EtiquetaStatus, CodigoAtivacaoCartao],
  template: `
    <div class="conteudo" style="max-width:860px">
      <a class="voltar" routerLink="/painel/usuarios"><span class="icone">arrow_back</span> Usuários</a>
      @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
      @if (usuario(); as u) {
        <div class="cabecalho-pagina">
          <div>
            <div class="linha"><h1>{{ u.nome }}</h1><app-status tipo="usuario" [valor]="u.status" /></div>
            <p>{{ u.matricula }} · {{ perfis[u.perfil].texto }} · {{ u.modulo }}</p>
          </div>
        </div>

        <div class="pilha-g">
          @if (codigo(); as c) { <app-codigo-ativacao [dados]="c" /> }

          <div class="divisao">
            <form class="card pilha" style="gap:14px" [formGroup]="form" (ngSubmit)="salvar()">
              <h2 class="card-titulo" style="margin:0">Dados</h2>
              <div class="campo"><label for="ud-nome">Nome</label><input id="ud-nome" class="entrada" formControlName="nome" maxlength="150"></div>
              <div class="campo"><label for="ud-email">E-mail</label><input id="ud-email" class="entrada" type="email" formControlName="email" maxlength="200">
                @if (u.vinculo === 'INTERNO') { <span class="dica">Login do painel.</span> }</div>
              <div class="linha"><button class="btn btn-primario" type="submit" [disabled]="form.pristine || ocupado()">Salvar</button></div>
            </form>

            <aside class="pilha">
              <div class="card">
                <dl class="ficha">
                  <dt>Acesso</dt><dd>{{ u.tipoCredencial === 'APP_ENTREGADOR' ? 'App (PIN)' : 'Painel (senha)' }}</dd>
                  <dt>Último acesso</dt><dd>{{ u.ultimoLoginEm ? (u.ultimoLoginEm | date) : 'nunca' }}</dd>
                  <dt>Cadastro</dt><dd>{{ u.criadoEm | date }}</dd>
                </dl>
              </div>
              <div class="card pilha">
                <button class="btn btn-secundario btn-bloco" (click)="novoCodigo()" [disabled]="ocupado()"><span class="icone">key</span> Gerar novo código</button>
                <span class="mini texto-2">Para quem esqueceu o PIN/senha, trocou de celular ou foi bloqueado. A credencial atual deixa de valer.</span>
                @if (u.status !== 'BLOQUEADO' && u.matricula !== minhaMatricula) {
                  <button class="btn btn-perigo btn-bloco" (click)="bloquear()" [disabled]="ocupado()"><span class="icone">block</span> Bloquear acesso</button>
                }
              </div>
            </aside>
          </div>
        </div>
      }
    </div>`,
})
export class UsuarioDetalhe implements OnInit {
  private readonly api = inject(UsuariosApi);
  private readonly avisos = inject(AvisoService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly minhaMatricula = inject(SessaoService).sessao()?.matricula;
  protected readonly perfis = PERFIS;

  readonly matricula = input.required<string>();

  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly codigo = signal<CodigoAtivacao | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly form = this.fb.group({ nome: ['', Validators.required], email: ['', Validators.email] });

  ngOnInit(): void {
    this.api.buscar(this.matricula()).subscribe({
      next: u => this.preencher(u),
      error: e => this.erro.set(erroApi(e).mensagem),
    });
  }

  private preencher(u: Usuario) {
    this.usuario.set(u);
    this.form.reset({ nome: u.nome, email: u.email ?? '' });
  }

  protected salvar(): void {
    const u = this.usuario();
    if (!u || this.form.invalid) return;
    const v = this.form.getRawValue();
    const mud: { nome?: string; email?: string | null } = {};
    if (v.nome.trim() !== u.nome) mud.nome = v.nome.trim();
    if ((v.email.trim() || null) !== u.email) mud.email = v.email.trim() || null;
    this.executar(this.api.atualizar(u.matricula, mud), 'Dados atualizados.');
  }

  protected bloquear(): void {
    const u = this.usuario();
    if (!u || !confirm(`Bloquear o acesso de ${u.nome}?`)) return;
    this.executar(this.api.atualizar(u.matricula, { status: 'BLOQUEADO' }), 'Acesso bloqueado.');
  }

  protected novoCodigo(): void {
    const u = this.usuario();
    if (!u) return;
    this.ocupado.set(true);
    this.api.novoCodigo(u.matricula).subscribe({
      next: c => { this.ocupado.set(false); this.codigo.set(c); this.ngOnInit(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      error: e => { this.ocupado.set(false); this.avisos.erro(erroApi(e).mensagem); },
    });
  }

  private executar(pedido$: ReturnType<UsuariosApi['atualizar']>, ok: string) {
    this.ocupado.set(true);
    pedido$.subscribe({
      next: u => { this.ocupado.set(false); this.preencher(u); this.avisos.sucesso(ok); },
      error: e => { this.ocupado.set(false); this.avisos.erro(erroApi(e).mensagem); },
    });
  }
}

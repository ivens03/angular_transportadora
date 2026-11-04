import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsuariosApi } from '../../core/api/usuarios.api';
import { aplicarErrosDeCampo, erroApi } from '../../core/erro';
import { CodigoAtivacao, Departamento, Vinculo } from '../../core/modelos';
import { PERFIS } from '../../core/rotulos';
import { CodigoAtivacaoCartao } from './codigo-ativacao';

/** Cadastro de matrícula: EXTERNO = entregador (PIN no app); INTERNO = funcionário de um departamento (senha no painel). */
@Component({
  selector: 'app-usuario-novo',
  imports: [ReactiveFormsModule, RouterLink, CodigoAtivacaoCartao],
  template: `
    <div class="conteudo" style="max-width:720px">
      <a class="voltar" routerLink="/painel/usuarios"><span class="icone">arrow_back</span> Usuários</a>
      @if (criado(); as c) {
        <div class="pilha-g">
          <app-codigo-ativacao [dados]="c" />
          <div class="linha quebra">
            <button class="btn btn-primario" (click)="outro()"><span class="icone">person_add</span> Cadastrar outro</button>
            <a class="btn btn-texto" routerLink="/painel/usuarios">Ver usuários</a>
          </div>
        </div>
      } @else {
        <div class="cabecalho-pagina"><div><h1>Novo usuário</h1><p>A matrícula é gerada automaticamente.</p></div></div>
        <form [formGroup]="form" (ngSubmit)="salvar()" class="card pilha" style="gap:18px" novalidate>
          <div class="vinculos" role="radiogroup" aria-label="Vínculo">
            <label class="opcao" [class.marcada]="vinculo() === 'EXTERNO'">
              <input type="radio" formControlName="vinculo" value="EXTERNO">
              <span class="icone">two_wheeler</span><span><b>Entregador</b><br><span class="mini texto-2">Usa o app com matrícula + PIN</span></span>
            </label>
            <label class="opcao" [class.marcada]="vinculo() === 'INTERNO'">
              <input type="radio" formControlName="vinculo" value="INTERNO">
              <span class="icone">badge</span><span><b>Funcionário</b><br><span class="mini texto-2">Usa o painel com e-mail + senha</span></span>
            </label>
          </div>
          <div class="campo">
            <label for="un-nome">Nome completo</label>
            <input id="un-nome" class="entrada" formControlName="nome" maxlength="150">
            @if (inv('nome')) { <span class="erro">Informe o nome.</span> }
          </div>
          <div class="campo">
            <label for="un-email">E-mail {{ vinculo() === 'EXTERNO' ? '(opcional)' : 'corporativo' }}</label>
            <input id="un-email" class="entrada" type="email" formControlName="email" maxlength="200">
            @if (vinculo() === 'INTERNO') { <span class="dica">É o login do painel.</span> }
            @if (inv('email')) { <span class="erro">{{ srv('email') ?? 'E-mail inválido.' }}</span> }
          </div>
          @if (vinculo() === 'INTERNO') {
            <div class="campo">
              <label for="un-dep">Departamento</label>
              <select id="un-dep" class="entrada" formControlName="departamento">
                @for (d of departamentos; track d) { <option [value]="d">{{ perfis[d].texto }}</option> }
              </select>
              <span class="dica">Define o perfil e o que a pessoa enxerga no painel.</span>
            </div>
          }
          @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
          <button class="btn btn-primario btn-bloco" type="submit" [disabled]="salvando()">
            @if (salvando()) { <span class="icone girando">progress_activity</span> } Cadastrar e gerar código
          </button>
        </form>
      }
    </div>`,
  styles: `
    .vinculos { display: grid; gap: 8px; grid-template-columns: 1fr; }
    @media (min-width: 560px) { .vinculos { grid-template-columns: 1fr 1fr; } }
    .opcao { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid var(--rc-borda); border-radius: var(--rc-raio); cursor: pointer; }
    .opcao input { width: 20px; height: 20px; accent-color: var(--rc-azul); }
    .opcao > .icone { color: var(--rc-azul); }
    .opcao.marcada { border-color: var(--rc-azul); background: var(--rc-azul-suave); }
  `,
})
export class UsuarioNovo {
  private readonly api = inject(UsuariosApi);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly perfis = PERFIS;
  protected readonly departamentos: Departamento[] = ['ADMINISTRATIVO', 'SUPORTE', 'FINANCEIRO', 'DESENVOLVIMENTO'];

  protected readonly form = this.fb.group({
    vinculo: ['EXTERNO' as Vinculo],
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', Validators.email],
    departamento: ['SUPORTE' as Departamento],
  });
  protected readonly vinculo = toSignal(this.form.controls.vinculo.valueChanges, { initialValue: 'EXTERNO' as Vinculo });
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly criado = signal<CodigoAtivacao | null>(null);
  protected readonly interno = computed(() => this.vinculo() === 'INTERNO');

  protected salvar(): void {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid) return;
    if (v.vinculo === 'INTERNO' && !v.email.trim()) { this.erro.set('Funcionário precisa de e-mail corporativo.'); return; }
    this.salvando.set(true);
    this.erro.set(null);
    this.api.criar({
      nome: v.nome.trim(), vinculo: v.vinculo,
      email: v.email.trim() || null,
      departamento: v.vinculo === 'INTERNO' ? v.departamento : null,
    }).subscribe({
      next: c => { this.salvando.set(false); this.criado.set(c); },
      error: e => { this.salvando.set(false); const err = erroApi(e); aplicarErrosDeCampo(this.form, err); this.erro.set(err.mensagem); },
    });
  }

  protected outro(): void {
    this.criado.set(null);
    this.form.reset({ vinculo: this.form.controls.vinculo.value, nome: '', email: '', departamento: 'SUPORTE' });
  }

  protected inv(c: string) { const x = this.form.get(c); return !!x && x.touched && x.invalid; }
  protected srv(c: string) { return (this.form.get(c)?.errors?.['servidor'] as string | undefined) ?? null; }
}

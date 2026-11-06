import { Mascara } from '../../shared/mascara';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AutenticacaoApi } from '../../core/api/autenticacao.api';
import { erroApi } from '../../core/erro';
import { Logo } from '../../shared/logo';
import { confere, regraPin, regraSenha } from './form-credencial';

/** Ativação: matrícula + código (gerado pelo Administrativo) → cadastra PIN (app) ou senha (painel). */
@Component({
  selector: 'app-primeiro-acesso',
  imports: [Mascara, ReactiveFormsModule, RouterLink, Logo],
  styleUrl: './acesso.scss',
  template: `
    <div class="faixa"><app-logo /></div>
    <div class="caixa">
      <div class="card">
        <h1>Primeiro acesso</h1>
        <p class="sub">Use a matrícula e o código de ativação que o Administrativo te passou.</p>
        <form [formGroup]="form" (ngSubmit)="ativar()">
          <div class="campo">
            <label for="pa-mat">Matrícula</label>
            <input id="pa-mat" class="entrada" mascara="matricula" formControlName="matricula" placeholder="ENT-000001" autocapitalize="characters">
          </div>
          <div class="campo">
            <label for="pa-cod">Código de ativação</label>
            <input id="pa-cod" class="entrada" mascara="codigo" formControlName="codigo" autocapitalize="characters" placeholder="8 letras ou números" autocomplete="one-time-code">
            <span class="dica">Vale 72 horas. Venceu? Peça um novo ao Administrativo.</span>
          </div>
          <div class="campo">
            <label for="pa-nova">{{ ehPin() ? 'Crie seu PIN' : 'Crie sua senha' }}</label>
            <input id="pa-nova" class="entrada" [class.entrada-pin]="ehPin()" type="password" formControlName="credencial"
                   [mascara]="ehPin() ? 'pin' : 'livre'" autocomplete="new-password">
            <span class="dica">{{ ehPin() ? '6 números, sem sequência óbvia. É com ele que você entra no app.' : 'Mínimo 10 caracteres, com letras e números. O login do painel é pelo e-mail.' }}</span>
            @if (form.controls.credencial.touched && form.controls.credencial.invalid) {
              <span class="erro">{{ ehPin() ? 'O PIN tem 6 números.' : 'Senha fraca: 10+ caracteres com letras e números.' }}</span>
            }
          </div>
          <div class="campo">
            <label for="pa-conf">Repita</label>
            <input id="pa-conf" class="entrada" [class.entrada-pin]="ehPin()" type="password" formControlName="confirmacao"
                   [mascara]="ehPin() ? 'pin' : 'livre'" autocomplete="new-password">
            @if (form.controls.confirmacao.touched && form.hasError('naoConfere')) { <span class="erro">Não confere.</span> }
          </div>
          @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
          <button class="btn btn-primario btn-bloco" type="submit" [disabled]="enviando()">
            @if (enviando()) { <span class="icone girando">progress_activity</span> } Ativar conta
          </button>
        </form>
      </div>
      <div class="rodape"><a routerLink="/entrar">Já tenho acesso</a></div>
    </div>`,
})
export class PrimeiroAcesso {
  private readonly api = inject(AutenticacaoApi);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly form = this.fb.group({
    matricula: ['', Validators.required],
    codigo: ['', Validators.required],
    credencial: ['', [Validators.required, regraPin]],
    confirmacao: ['', Validators.required],
  }, { validators: confere('credencial', 'confirmacao') });

  private readonly matricula = toSignal(this.form.controls.matricula.valueChanges, { initialValue: '' });
  protected readonly ehPin = computed(() => !this.matricula().toUpperCase().startsWith('FUN'));

  constructor() {
    this.form.controls.matricula.valueChanges.subscribe(() => {
      const c = this.form.controls.credencial;
      c.setValidators([Validators.required, this.ehPin() ? regraPin : regraSenha]);
      c.updateValueAndValidity({ emitEvent: false });
    });
  }

  protected ativar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);
    this.api.ativar(v.matricula.trim().toUpperCase(), v.codigo.trim(), v.credencial).subscribe({
      next: () => {
        localStorage.setItem('rotacerta.modo', this.ehPin() ? 'app' : 'painel');
        this.router.navigate(['/entrar'], { queryParams: { mensagem: 'Conta ativada! Agora é só entrar.' } });
      },
      error: e => { this.enviando.set(false); this.erro.set(erroApi(e).mensagem); },
    });
  }
}

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AutenticacaoApi } from '../../core/api/autenticacao.api';
import { erroApi } from '../../core/erro';

/** Mesmas regras do back-end (usuario/service/PoliticaCredencial.java). */
export const regraPin = Validators.pattern(/^\d{6}$/);
export function regraSenha(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '');
  return v.length >= 10 && /[A-Za-z]/.test(v) && /\d/.test(v) ? null : { senhaFraca: true };
}
export function confere(campoA: string, campoB: string) {
  return (g: AbstractControl): ValidationErrors | null =>
    g.get(campoA)?.value === g.get(campoB)?.value ? null : { naoConfere: true };
}

/**
 * Troca de PIN/senha (PATCH /auth/credenciais/{matricula}). Usado na tela pública
 * (credencial vencida) e em "Minha conta".
 */
@Component({
  selector: 'app-form-credencial',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="enviar()" class="pilha" style="gap:16px">
      @if (!matriculaFixa()) {
        <div class="campo">
          <label for="fc-mat">Matrícula</label>
          <input id="fc-mat" class="entrada" formControlName="matricula" placeholder="ENT-000001 ou FUN-000001" autocapitalize="characters">
        </div>
      }
      <div class="campo">
        <label for="fc-atual">{{ ehPin() ? 'PIN atual' : 'Senha atual' }}</label>
        <input id="fc-atual" class="entrada" [class.entrada-pin]="ehPin()" type="password" formControlName="atual"
               [attr.inputmode]="ehPin() ? 'numeric' : null" [attr.maxlength]="ehPin() ? 6 : null" autocomplete="current-password">
      </div>
      <div class="campo">
        <label for="fc-nova">{{ ehPin() ? 'Novo PIN' : 'Nova senha' }}</label>
        <input id="fc-nova" class="entrada" [class.entrada-pin]="ehPin()" type="password" formControlName="nova"
               [attr.inputmode]="ehPin() ? 'numeric' : null" [attr.maxlength]="ehPin() ? 6 : null" autocomplete="new-password">
        <span class="dica">{{ ehPin() ? '6 números, sem sequência óbvia (123456, 111111…).' : 'Mínimo 10 caracteres, com letras e números.' }}</span>
        @if (form.controls.nova.touched && form.controls.nova.invalid) {
          <span class="erro"><span class="icone" style="font-size:16px">error</span>{{ ehPin() ? 'O PIN tem 6 números.' : 'Senha fraca: 10+ caracteres com letras e números.' }}</span>
        }
      </div>
      <div class="campo">
        <label for="fc-conf">Repita {{ ehPin() ? 'o novo PIN' : 'a nova senha' }}</label>
        <input id="fc-conf" class="entrada" [class.entrada-pin]="ehPin()" type="password" formControlName="confirmacao"
               [attr.inputmode]="ehPin() ? 'numeric' : null" [attr.maxlength]="ehPin() ? 6 : null" autocomplete="new-password">
        @if (form.controls.confirmacao.touched && form.hasError('naoConfere')) {
          <span class="erro"><span class="icone" style="font-size:16px">error</span>Não confere com o que você digitou acima.</span>
        }
      </div>
      @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
      <button class="btn btn-primario btn-bloco" type="submit" [disabled]="enviando()">
        @if (enviando()) { <span class="icone girando">progress_activity</span> } Salvar {{ ehPin() ? 'novo PIN' : 'nova senha' }}
      </button>
    </form>`,
})
export class FormCredencial {
  private readonly api = inject(AutenticacaoApi);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Matrícula já conhecida (Minha conta / redirecionamento do login). */
  readonly matriculaFixa = input<string | null>(null);
  readonly trocou = output<string>();

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  private readonly matriculaDigitada = signal('');

  protected readonly form = this.fb.group({
    matricula: [''],
    atual: ['', Validators.required],
    nova: ['', Validators.required],
    confirmacao: ['', Validators.required],
  }, { validators: confere('nova', 'confirmacao') });

  /** Entregador (ENT-) usa PIN; funcionário (FUN-) usa senha. */
  protected readonly ehPin = computed(() => (this.matriculaFixa() ?? this.matriculaDigitada()).toUpperCase().startsWith('ENT'));

  constructor() {
    this.form.controls.matricula.valueChanges.subscribe(v => {
      this.matriculaDigitada.set(v);
      this.ajustarRegra();
    });
    queueMicrotask(() => this.ajustarRegra());
  }

  private ajustarRegra() {
    const nova = this.form.controls.nova;
    nova.setValidators([Validators.required, this.ehPin() ? regraPin : regraSenha]);
    nova.updateValueAndValidity({ emitEvent: false });
  }

  protected enviar(): void {
    this.form.markAllAsTouched();
    const matricula = (this.matriculaFixa() ?? this.form.controls.matricula.value).trim().toUpperCase();
    if (this.form.invalid || !matricula) return;
    this.enviando.set(true);
    this.erro.set(null);
    const v = this.form.getRawValue();
    this.api.trocarCredencial(matricula, v.atual, v.nova).subscribe({
      next: () => { this.enviando.set(false); this.form.reset(); this.trocou.emit(matricula); },
      error: e => { this.enviando.set(false); this.erro.set(erroApi(e).mensagem); },
    });
  }
}

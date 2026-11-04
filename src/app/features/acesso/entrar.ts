import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AutenticacaoApi } from '../../core/api/autenticacao.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { erroApi } from '../../core/erro';
import { Logo } from '../../shared/logo';

type Modo = 'app' | 'painel';

/**
 * Login com as duas credenciais da API:
 *  - entregador: matrícula + PIN (POST /auth/app/tokens)
 *  - funcionário: e-mail + senha (POST /auth/painel/tokens)
 * Senha/PIN vencido (403 CREDENCIAL_EXPIRADA) leva para a troca obrigatória.
 */
@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, RouterLink, Logo],
  styleUrl: './acesso.scss',
  template: `
    <div class="faixa"><app-logo /></div>
    <div class="caixa">
      <div class="card">
        <h1>Que bom te ver!</h1>
        <p class="sub">Entre para ver suas entregas e rotas.</p>

        @if (motivo() === 'expirou') {
          <div class="aviso alerta" style="margin-bottom:16px"><span class="icone">schedule</span>Sua sessão expirou. Entre de novo.</div>
        }
        @if (mensagem()) {
          <div class="aviso sucesso" style="margin-bottom:16px"><span class="icone">check_circle</span>{{ mensagem() }}</div>
        }

        <div class="abas" role="tablist">
          <button type="button" role="tab" [class.ativa]="modo() === 'app'" [attr.aria-selected]="modo() === 'app'" (click)="trocarModo('app')">
            <span class="icone">two_wheeler</span> Sou entregador
          </button>
          <button type="button" role="tab" [class.ativa]="modo() === 'painel'" [attr.aria-selected]="modo() === 'painel'" (click)="trocarModo('painel')">
            <span class="icone">badge</span> Sou da empresa
          </button>
        </div>

        @if (modo() === 'app') {
          <form [formGroup]="app" (ngSubmit)="entrar()">
            <div class="campo">
              <label for="mat">Matrícula</label>
              <input id="mat" class="entrada" formControlName="matricula" placeholder="ENT-000001" autocapitalize="characters" autocomplete="username">
            </div>
            <div class="campo">
              <label for="pin">PIN</label>
              <input id="pin" class="entrada entrada-pin" type="password" inputmode="numeric" maxlength="6" formControlName="pin" autocomplete="current-password" placeholder="••••••">
              <span class="dica">Os 6 números que você cadastrou no primeiro acesso.</span>
            </div>
            @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
            <button class="btn btn-primario btn-bloco" type="submit" [disabled]="enviando()">
              @if (enviando()) { <span class="icone girando">progress_activity</span> } Entrar
            </button>
          </form>
        } @else {
          <form [formGroup]="painel" (ngSubmit)="entrar()">
            <div class="campo">
              <label for="email">E-mail corporativo</label>
              <input id="email" class="entrada" type="email" formControlName="email" placeholder="nome@empresa.com" autocomplete="username">
            </div>
            <div class="campo">
              <label for="senha">Senha</label>
              <div class="senha">
                <input id="senha" class="entrada" [type]="verSenha() ? 'text' : 'password'" formControlName="senha" autocomplete="current-password">
                <button type="button" class="btn btn-icone olho" (click)="verSenha.set(!verSenha())" [attr.aria-label]="verSenha() ? 'Ocultar senha' : 'Mostrar senha'">
                  <span class="icone">{{ verSenha() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>
            @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
            <button class="btn btn-primario btn-bloco" type="submit" [disabled]="enviando()">
              @if (enviando()) { <span class="icone girando">progress_activity</span> } Entrar
            </button>
          </form>
        }
      </div>

      <div class="rodape">
        <span>Recebeu um código de ativação? <a routerLink="/primeiro-acesso">Primeiro acesso</a></span>
        <a routerLink="/trocar-credencial">Quero trocar meu PIN ou senha</a>
      </div>
    </div>`,
})
export class Entrar {
  private readonly api = inject(AutenticacaoApi);
  private readonly sessao = inject(SessaoService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** ?motivo=expirou / ?mensagem=... vindos de outras telas (withComponentInputBinding). */
  readonly motivo = input<string>();
  readonly mensagem = input<string>();
  /** Página que a pessoa tentou abrir antes de logar. */
  readonly voltar = input<string>();

  protected readonly modo = signal<Modo>((localStorage.getItem('rotacerta.modo') as Modo) || 'app');
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly verSenha = signal(false);

  protected readonly app = this.fb.group({
    matricula: ['', Validators.required],
    pin: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  protected readonly painel = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  protected trocarModo(m: Modo) {
    this.modo.set(m);
    this.erro.set(null);
    localStorage.setItem('rotacerta.modo', m);
  }

  protected entrar(): void {
    const ehApp = this.modo() === 'app';
    const form = ehApp ? this.app : this.painel;
    form.markAllAsTouched();
    if (form.invalid) {
      this.erro.set(ehApp ? 'Informe a matrícula e o PIN de 6 números.' : 'Informe um e-mail válido e a senha.');
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);
    const token$ = ehApp
      ? this.api.entrarApp(this.app.getRawValue().matricula.trim().toUpperCase(), this.app.getRawValue().pin)
      : this.api.entrarPainel(this.painel.getRawValue().email.trim(), this.painel.getRawValue().senha);

    this.sessao.iniciar(token$).subscribe({
      next: () => {
        // só volta para dentro da "casa" certa (entregador não cai no painel e vice-versa)
        const destino = this.voltar();
        this.router.navigateByUrl(destino?.startsWith(this.sessao.inicio()) ? destino : this.sessao.inicio());
      },
      error: e => {
        this.enviando.set(false);
        const err = erroApi(e);
        if (err.codigo === 'CREDENCIAL_EXPIRADA') {
          // a mensagem do back-end traz a matrícula: ".../credenciais/FUN-000002."
          const matricula = /credenciais\/([A-Z]+-[A-Z0-9-]+)/.exec(err.mensagem)?.[1]
            ?? (ehApp ? this.app.getRawValue().matricula.toUpperCase() : null);
          this.router.navigate(['/trocar-credencial'], { queryParams: { matricula, vencida: 1 } });
          return;
        }
        this.erro.set(err.mensagem);
      },
    });
  }
}

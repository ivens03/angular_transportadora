import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Logo } from '../../shared/logo';
import { FormCredencial } from './form-credencial';

/** Tela pública de troca (quem está com o PIN/senha vencido não tem token). */
@Component({
  selector: 'app-trocar-credencial',
  imports: [RouterLink, Logo, FormCredencial],
  styleUrl: './acesso.scss',
  template: `
    <div class="faixa"><app-logo /></div>
    <div class="caixa">
      <div class="card">
        <h1>Trocar {{ ehPin() ? 'PIN' : 'senha' }}</h1>
        <p class="sub">
          @if (vencida()) { Por segurança, {{ ehPin() ? 'o PIN' : 'a senha' }} vale 30 dias. Cadastre {{ ehPin() ? 'um novo' : 'uma nova' }} para continuar. }
          @else { Informe a matrícula e {{ ehPin() ? 'o PIN atual' : 'a senha atual' }}. }
        </p>
        @if (vencida()) {
          <div class="aviso alerta" style="margin-bottom:16px"><span class="icone">key</span>{{ ehPin() ? 'Seu PIN venceu' : 'Sua senha venceu' }} ({{ matricula() }}).</div>
        }
        <app-form-credencial [matriculaFixa]="matricula() ?? null" (trocou)="pronto()" />
      </div>
      <div class="rodape"><a routerLink="/entrar">Voltar para o login</a></div>
    </div>`,
})
export class TrocarCredencial {
  private readonly router = inject(Router);
  readonly matricula = input<string>();
  readonly vencida = input<string>();

  protected ehPin() { return (this.matricula() ?? '').startsWith('ENT'); }

  protected pronto() {
    this.router.navigate(['/entrar'], { queryParams: { mensagem: 'Pronto! Entre com a nova credencial.' } });
  }
}

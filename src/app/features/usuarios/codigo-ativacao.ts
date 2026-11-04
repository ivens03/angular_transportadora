import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { AvisoService } from '../../core/aviso.service';
import { CodigoAtivacao } from '../../core/modelos';

/** O código aparece UMA vez só (o back-end guarda apenas o hash): destaque + copiar. */
@Component({
  selector: 'app-codigo-ativacao',
  imports: [DatePipe],
  template: `
    <div class="card codigo">
      <span class="icone cheio verde" style="font-size:40px">key</span>
      <h2>Código de ativação de {{ dados().nome }}</h2>
      <p class="pequeno texto-2">Matrícula <b>{{ dados().matricula }}</b> · vale até {{ dados().codigoExpiraEm | date }}</p>
      <div class="valor">{{ dados().codigoAtivacao }}</div>
      <button class="btn btn-secundario" (click)="copiar()"><span class="icone">content_copy</span> Copiar matrícula e código</button>
      <div class="aviso alerta"><span class="icone">visibility_off</span>Anote ou envie agora: este código não aparece de novo.</div>
      <p class="pequeno texto-2">{{ dados().tipoCredencial === 'APP_ENTREGADOR'
        ? 'No app: Primeiro acesso → matrícula + código → cria um PIN de 6 números.'
        : 'No painel: Primeiro acesso → matrícula + código → cria a senha. Depois o login é pelo e-mail.' }}</p>
    </div>`,
  styles: `
    .codigo { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; border-top: 4px solid var(--rc-verde); }
    .codigo h2 { font-size: 18px; }
    .valor { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 28px; font-weight: 800; letter-spacing: 3px; padding: 12px 20px;
      background: var(--rc-cinza-suave); border-radius: var(--rc-raio); user-select: all; word-break: break-all; }
  `,
})
export class CodigoAtivacaoCartao {
  private readonly avisos = inject(AvisoService);
  readonly dados = input.required<CodigoAtivacao>();

  protected copiar(): void {
    const d = this.dados();
    navigator.clipboard?.writeText(`Matrícula: ${d.matricula}\nCódigo de ativação: ${d.codigoAtivacao}`)
      .then(() => this.avisos.sucesso('Copiado.'), () => this.avisos.erro('Não deu para copiar: selecione o código.'));
  }
}

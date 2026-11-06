import { Directive, ElementRef, forwardRef, inject, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TipoMascara, aplicar, significativo } from '../core/mascaras';

/**
 * Máscara de campo: <input mascara="cep" formControlName="cep">.
 * É um ControlValueAccessor (a "ponte" entre o <input> e o formulário do Angular): o campo mostra o texto
 * formatado e o formulário recebe o valor limpo que a API espera (CEP só com dígitos, decimal como number).
 * Quando ela está no input, substitui a ponte padrão do Angular (DefaultValueAccessor) para aquele campo.
 */
@Directive({
  selector: 'input[mascara]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Mascara), multi: true }],
  host: {
    '(input)': 'aoDigitar($event)',
    '(blur)': 'aoTocado()',
    '[attr.inputmode]': 'teclado()',
  },
})
export class Mascara implements ControlValueAccessor {
  readonly mascara = input.required<TipoMascara>();
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private mudou: (v: unknown) => void = () => {};
  private tocou: () => void = () => {};

  /** Teclado certo no celular: só números para CEP/telefone, decimal com vírgula etc. */
  protected teclado(): string | null {
    const t = this.mascara();
    if (t === 'livre') return null;
    if (t.startsWith('decimal:')) return 'decimal';
    if (t === 'telefone') return 'tel';
    if (t === 'email') return 'email';
    return ['cep', 'renavam', 'pin', 'ano', 'inteiro'].includes(t) ? 'numeric' : 'text';
  }

  writeValue(v: unknown): void {
    this.el.value = aplicar(this.mascara(), v as string | number | null).exibir;
  }

  registerOnChange(fn: (v: unknown) => void): void { this.mudou = fn; }
  registerOnTouched(fn: () => void): void { this.tocou = fn; }
  setDisabledState(desabilitado: boolean): void { this.el.disabled = desabilitado; }

  protected aoTocado(): void { this.tocou(); }

  protected aoDigitar(e: Event): void {
    const t = this.mascara();
    const bruto = this.el.value;
    // quantos caracteres "de verdade" havia antes do cursor: o cursor volta para depois do mesmo caractere
    const cursor = this.el.selectionStart ?? bruto.length;
    const antes = [...bruto.slice(0, cursor)].filter(c => significativo(t, c)).length;
    const colado = (e as InputEvent).inputType === 'insertFromPaste';

    const r = aplicar(t, bruto, colado);
    this.el.value = r.exibir;
    if (document.activeElement === this.el && this.el.type !== 'email') {
      // digitando no fim (o normal): cursor no fim. Editando no meio: volta para depois do mesmo caractere.
      if (cursor >= bruto.length) {
        this.el.setSelectionRange(r.exibir.length, r.exibir.length);
        this.mudou(r.valor);
        return;
      }
      let pos = 0;
      for (let vistos = 0; pos < r.exibir.length && vistos < antes; pos++) {
        if (significativo(t, r.exibir[pos])) vistos++;
      }
      this.el.setSelectionRange(pos, pos);
    }
    this.mudou(r.valor);
  }
}

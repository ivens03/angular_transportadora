import { Component, computed, input } from '@angular/core';
import { rotulo } from '../core/rotulos';

/** <app-status tipo="carga" [valor]="c.status" /> → etiqueta colorida com o texto em português. */
@Component({
  selector: 'app-status',
  template: `<span class="etiqueta {{ r().cor }}">
    @if (comIcone() && r().icone) { <span class="icone" style="font-size:14px" aria-hidden="true">{{ r().icone }}</span> }
    {{ r().texto }}</span>`,
})
export class EtiquetaStatus {
  readonly tipo = input.required<string>();
  readonly valor = input<string | null | undefined>();
  readonly comIcone = input(false);
  protected readonly r = computed(() => rotulo(this.tipo(), this.valor()));
}

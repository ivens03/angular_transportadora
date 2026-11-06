import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientesApi } from '../../core/api/clientes.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { formatarCnpj } from '../../core/cnpj';
import { erroApi } from '../../core/erro';
import { Cliente, Permissao } from '../../core/modelos';
import { Carregando } from '../../shared/carregando';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Vazio } from '../../shared/vazio';

/** Empresas clientes: a entrega é "para a empresa X" e ela acompanha pelo Portal do Cliente. */
@Component({
  selector: 'app-empresas-lista',
  imports: [RouterLink, FormsModule, EtiquetaStatus, Vazio, Carregando],
  template: `
    <div class="conteudo">
      <div class="cabecalho-pagina">
        <div><h1>Empresas</h1><p>Clientes da transportadora. A entrega é para uma empresa e ela acompanha pelo portal.</p></div>
        <div class="acoes"><a class="btn btn-primario" routerLink="/painel/empresas/nova"><span class="icone">add_business</span> Nova empresa</a></div>
      </div>
      <input class="entrada" placeholder="Buscar por nome, CNPJ ou bairro" [ngModel]="busca()" (ngModelChange)="busca.set($event)" aria-label="Buscar empresa" style="margin-bottom:12px">

      @if (carregando()) {
        <app-carregando />
      } @else if (erro()) {
        <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div>
      } @else if (!filtradas().length) {
        <div class="card"><app-vazio icone="storefront" titulo="Nenhuma empresa" texto="Cadastre a primeira empresa cliente." /></div>
      } @else {
        <ul class="lista card sem-padding">
          @for (c of filtradas(); track c.matricula) {
            <li><div class="item">
              <span class="item-icone"><span class="icone">storefront</span></span>
              <span class="cresce">
                <span class="item-titulo">{{ c.nome }}</span>
                <span class="item-sub" style="display:block">
                  {{ c.cnpj ? formatarCnpj(c.cnpj) : 'sem CNPJ' }} · {{ c.matricula }}
                  @if (c.bairro) { · {{ c.bairro }}, {{ c.cidade }} }
                </span>
              </span>
              <span class="pilha" style="gap:6px;align-items:flex-end">
                <app-status tipo="usuario" [valor]="c.status" />
                @if (podeEntregar) {
                  <a class="btn btn-texto btn-pequeno" [routerLink]="['/painel/cargas/nova']" [queryParams]="{ empresa: c.matricula }">
                    <span class="icone">local_shipping</span> Nova entrega</a>
                }
              </span>
            </div></li>
          }
        </ul>
      }
    </div>`,
})
export class EmpresasLista {
  private readonly api = inject(ClientesApi);
  protected readonly podeEntregar = inject(SessaoService).tem(Permissao.ENTREGA_CADASTRAR);
  protected readonly formatarCnpj = formatarCnpj;
  protected readonly empresas = signal<Cliente[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly busca = signal('');

  protected readonly filtradas = computed(() => {
    const t = this.busca().trim().toLowerCase();
    const so = t.replace(/[.\-/]/g, '');
    return this.empresas().filter(c => !t || c.nome.toLowerCase().includes(t) || (c.cnpj ?? '').toLowerCase().includes(so)
      || (c.bairro ?? '').toLowerCase().includes(t));
  });

  constructor() {
    this.api.listar().subscribe({
      next: p => { this.empresas.set(p.content); this.carregando.set(false); },
      error: e => { this.erro.set(erroApi(e).mensagem); this.carregando.set(false); },
    });
  }
}

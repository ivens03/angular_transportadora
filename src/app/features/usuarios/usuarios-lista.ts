import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UsuariosApi } from '../../core/api/usuarios.api';
import { erroApi } from '../../core/erro';
import { Pagina, Usuario } from '../../core/modelos';
import { PERFIS } from '../../core/rotulos';
import { Carregando } from '../../shared/carregando';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { Paginacao } from '../../shared/paginacao';

@Component({
  selector: 'app-usuarios-lista',
  imports: [RouterLink, DatePipe, EtiquetaStatus, Paginacao, Carregando],
  template: `
    <div class="conteudo">
      <div class="cabecalho-pagina">
        <div><h1>Usuários</h1><p>@if (pagina(); as p) { {{ p.page.totalElements }} cadastrado(s) } @else { Carregando… }</p></div>
        <div class="acoes"><a class="btn btn-primario" routerLink="/painel/usuarios/novo"><span class="icone">person_add</span> Novo usuário</a></div>
      </div>

      @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
      @else if (!pagina()) { <app-carregando [quantidade]="6" /> }
      @else {
        <ul class="lista card sem-padding">
          @for (u of pagina()!.content; track u.matricula) {
            <li><a class="item" [routerLink]="['/painel/usuarios', u.matricula]">
              <span class="item-icone"><span class="icone">{{ perfis[u.perfil].icone }}</span></span>
              <span class="cresce">
                <span class="linha"><span class="item-titulo truncar">{{ u.nome }}</span><app-status tipo="usuario" [valor]="u.status" /></span>
                <span class="item-sub" style="display:block">{{ u.matricula }} · {{ perfis[u.perfil].texto }} @if (u.email) { · {{ u.email }} }</span>
              </span>
              <span class="mini texto-3 so-desktop nowrap">{{ u.ultimoLoginEm ? ('Último acesso ' + (u.ultimoLoginEm | date: 'dd/MM HH:mm')) : 'Nunca entrou' }}</span>
              <span class="icone seta">chevron_right</span>
            </a></li>
          }
        </ul>
        <app-paginacao [pagina]="pagina()" (ir)="irPara($event)" />
      }
    </div>`,
})
export class UsuariosLista {
  private readonly api = inject(UsuariosApi);
  private readonly router = inject(Router);
  readonly page = input<string>();
  protected readonly perfis = PERFIS;
  protected readonly pagina = signal<Pagina<Usuario> | null>(null);
  protected readonly erro = signal<string | null>(null);

  constructor() {
    effect(() => {
      const page = Number(this.page() ?? 0);
      untracked(() => this.api.listar(page, 20).subscribe({
        next: p => this.pagina.set(p), error: e => this.erro.set(erroApi(e).mensagem),
      }));
    });
  }

  protected irPara(page: number) { this.router.navigate([], { queryParams: { page: page || null } }); }
}

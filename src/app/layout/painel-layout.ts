import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { SessaoService } from '../core/auth/sessao.service';
import { Permissao } from '../core/modelos';
import { PERFIS } from '../core/rotulos';
import { Logo } from '../shared/logo';
import { MENU_PAINEL } from './menu';

/**
 * Casca do painel web. Celular: cabeçalho amarelo + busca + menu lateral (gaveta).
 * Desktop (≥ 900px): a gaveta some e os itens viram uma barra de categorias no cabeçalho.
 */
@Component({
  selector: 'app-painel-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, Logo],
  templateUrl: './painel-layout.html',
  styleUrl: './painel-layout.scss',
})
export class PainelLayout {
  protected readonly sessao = inject(SessaoService);
  private readonly router = inject(Router);

  protected readonly menuAberto = signal(false);
  protected readonly menuUsuario = signal(false);
  protected busca = '';

  protected readonly itens = computed(() => MENU_PAINEL.filter(i => !i.permissao || this.sessao.tem(i.permissao)));
  protected readonly podeBuscarCargas = computed(() => this.sessao.tem(Permissao.ENTREGA_CADASTRAR));
  protected readonly perfil = computed(() => PERFIS[this.sessao.sessao()?.perfil ?? ''] ?? { texto: '', icone: 'person' });
  protected readonly iniciais = computed(() =>
    (this.sessao.sessao()?.nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase());

  constructor() {
    // fecha a gaveta ao navegar
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
      this.menuAberto.set(false);
      this.menuUsuario.set(false);
    });
  }

  protected buscar(): void {
    const termo = this.busca.trim();
    this.router.navigate(['/painel/cargas'], { queryParams: termo ? { bairro: termo } : {} });
  }
}

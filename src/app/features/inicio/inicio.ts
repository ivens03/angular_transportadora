import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CargasApi } from '../../core/api/cargas.api';
import { RotasApi } from '../../core/api/rotas.api';
import { UsuariosApi } from '../../core/api/usuarios.api';
import { VeiculosApi } from '../../core/api/veiculos.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { hojeIso } from '../../core/geo';
import { MetricaFrota, Permissao, RotaResumo } from '../../core/modelos';
import { PERFIS } from '../../core/rotulos';

interface Atalho { titulo: string; texto: string; icone: string; link: string; permissao: string; }

const ATALHOS: Atalho[] = [
  { titulo: 'Montar rota', texto: 'Escolha cargas, veículo e entregador', icone: 'add_road', link: '/painel/rotas/nova', permissao: Permissao.ENTREGA_CADASTRAR },
  { titulo: 'Nova carga', texto: 'Cadastre o que vai sair para entrega', icone: 'add_box', link: '/painel/cargas/nova', permissao: Permissao.ENTREGA_CADASTRAR },
  { titulo: 'Acompanhar rotas', texto: 'Veja no mapa quem está na rua', icone: 'map', link: '/painel/rotas', permissao: Permissao.MAPA_ACOMPANHAR },
  { titulo: 'Frota', texto: 'Veículos e abastecimentos', icone: 'local_shipping', link: '/painel/veiculos', permissao: Permissao.VEICULO_GERENCIAR },
  { titulo: 'Consumo', texto: 'km/l, R$/km e alertas', icone: 'local_gas_station', link: '/painel/consumo', permissao: Permissao.CONSUMO_VER_METRICAS },
  { titulo: 'Novo usuário', texto: 'Entregador ou funcionário', icone: 'person_add', link: '/painel/usuarios/novo', permissao: Permissao.USUARIO_GERENCIAR },
  { titulo: 'Usuários', texto: 'Ativação, bloqueio e códigos', icone: 'group', link: '/painel/usuarios', permissao: Permissao.USUARIO_GERENCIAR },
  { titulo: 'Monitoramento', texto: 'Saúde da API e documentação', icone: 'monitor_heart', link: '/painel/monitoramento', permissao: Permissao.MENSAGERIA_MONITORAR },
];

/** Início do painel: atalhos e números do dia conforme o perfil de quem entrou. */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink, DecimalPipe, CurrencyPipe],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  protected readonly sessao = inject(SessaoService);
  private readonly cargas = inject(CargasApi);
  private readonly rotas = inject(RotasApi);
  private readonly veiculos = inject(VeiculosApi);
  private readonly usuarios = inject(UsuariosApi);

  protected readonly perfil = computed(() => PERFIS[this.sessao.sessao()?.perfil ?? '']);
  protected readonly atalhos = computed(() => ATALHOS.filter(a => this.sessao.tem(a.permissao)));
  protected readonly saudacao = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })();

  protected readonly cargasAguardando = signal<number | null>(null);
  protected readonly cargasEmTransito = signal<number | null>(null);
  protected readonly rotasAtivas = signal<RotaResumo[] | null>(null);
  protected readonly rotasPlanejadas = signal<number | null>(null);
  protected readonly veiculosAtivos = signal<number | null>(null);
  protected readonly veiculosManutencao = signal<number | null>(null);
  protected readonly frota = signal<MetricaFrota | null>(null);
  protected readonly totalUsuarios = signal<number | null>(null);

  protected readonly P = Permissao;

  constructor() {
    const s = this.sessao;
    if (s.tem(Permissao.ENTREGA_CADASTRAR)) {
      this.cargas.listar({ status: 'AGUARDANDO_ROTA', size: 1 }).subscribe(p => this.cargasAguardando.set(p.page.totalElements));
      this.cargas.listar({ status: 'EM_TRANSITO', size: 1 }).subscribe(p => this.cargasEmTransito.set(p.page.totalElements));
    }
    if (s.tem(Permissao.MAPA_ACOMPANHAR)) {
      this.rotas.listar({ status: 'EM_ANDAMENTO', size: 5, sort: 'iniciadaEm,desc' }).subscribe(p => this.rotasAtivas.set(p.content));
      this.rotas.listar({ status: 'PLANEJADA', size: 1 }).subscribe(p => this.rotasPlanejadas.set(p.page.totalElements));
    }
    if (s.tem(Permissao.VEICULO_GERENCIAR)) {
      this.veiculos.listar({ status: 'ATIVO', size: 1 }).subscribe(p => this.veiculosAtivos.set(p.page.totalElements));
      this.veiculos.listar({ status: 'EM_MANUTENCAO', size: 1 }).subscribe(p => this.veiculosManutencao.set(p.page.totalElements));
    }
    if (s.tem(Permissao.CONSUMO_VER_METRICAS)) {
      this.veiculos.metricaFrota(hojeIso(-30), hojeIso()).subscribe(m => this.frota.set(m));
    }
    if (s.tem(Permissao.USUARIO_GERENCIAR)) {
      this.usuarios.listar(0, 1).subscribe(p => this.totalUsuarios.set(p.page.totalElements));
    }
  }
}

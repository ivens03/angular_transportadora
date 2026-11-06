import { Mascara } from '../../shared/mascara';
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CargasApi } from '../../core/api/cargas.api';
import { ClientesApi } from '../../core/api/clientes.api';
import { RotasApi } from '../../core/api/rotas.api';
import { UsuariosApi } from '../../core/api/usuarios.api';
import { VeiculosApi } from '../../core/api/veiculos.api';
import { formatarCnpj } from '../../core/cnpj';
import { EnderecoApi } from '../../core/api/endereco.api';
import { AvisoService } from '../../core/aviso.service';
import { aplicarErrosDeCampo, erroApi } from '../../core/erro';
import { Carga, CargaForm, Cliente, Entregador, RotaResumo, Veiculo } from '../../core/modelos';
import { EtiquetaStatus } from '../../shared/etiqueta-status';
import { MapaPonto } from '../../shared/mapa/mapa-ponto';

const CAMPOS_ENDERECO = ['endereco', 'bairro', 'cidade', 'uf', 'cep'] as const;

/**
 * Cadastro (POST) e edição (PATCH) de carga — a "entrega". O destino precisa de coordenadas:
 * o CEP preenche o endereço (ViaCEP), "Localizar" acha o ponto (OpenStreetMap)
 * e o pino pode ser ajustado à mão no mapa.
 *
 * Entrega para uma empresa: escolhida a empresa, destinatário e endereço vêm do cadastro dela e a carga fica
 * vinculada (a empresa acompanha pelo Portal do Cliente). Na carga nova dá para já escolher o entregador e o
 * veículo: depois de cadastrar, a rota é gerada na hora (POST /rotas só com esta carga).
 */
@Component({
  selector: 'app-carga-form',
  imports: [Mascara, ReactiveFormsModule, RouterLink, DatePipe, MapaPonto, EtiquetaStatus],
  templateUrl: './carga-form.html',
})
export class CargaFormulario implements OnInit {
  private readonly api = inject(CargasApi);
  private readonly clientesApi = inject(ClientesApi);
  private readonly rotasApi = inject(RotasApi);
  private readonly usuariosApi = inject(UsuariosApi);
  private readonly veiculosApi = inject(VeiculosApi);
  protected readonly formatarCnpj = formatarCnpj;
  private readonly enderecos = inject(EnderecoApi);
  private readonly avisos = inject(AvisoService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** :id da URL (ausente em /cargas/nova). */
  readonly id = input<string>();
  /** ?empresa=CLI-000001: já abre com a empresa escolhida (vindo da tela de Empresas). */
  readonly empresa = input<string>();

  protected readonly empresas = signal<Cliente[]>([]);
  protected readonly entregadores = signal<Entregador[]>([]);
  protected readonly veiculos = signal<Veiculo[]>([]);
  protected readonly empresaEscolhida = computed(() =>
    this.empresas().find(e => e.matricula === this.clienteMatricula()) ?? null);
  /** Espelho do campo clienteMatricula em signal (para o computed acima). */
  protected readonly clienteMatricula = signal('');
  protected readonly entregadorMatricula = signal('');
  protected readonly veiculoId = signal<number | null>(null);
  /** Rotas que ainda não terminaram: quem está nelas não pode ganhar outra rota. */
  protected readonly rotasAtivas = signal<RotaResumo[]>([]);
  /** Entregador escolhido já tem rota PLANEJADA: a entrega entra nela (com o veículo dela). */
  protected readonly rotaDoEntregador = computed(() =>
    this.rotasAtivas().find(r => r.entregadorMatricula === this.entregadorMatricula() && r.status === 'PLANEJADA') ?? null);
  protected readonly podeLevar = computed(() => !!this.rotaDoEntregador() || (!!this.entregadorMatricula() && !!this.veiculoId()));

  protected readonly carga = signal<Carga | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly buscandoCep = signal(false);
  protected readonly localizando = signal(false);
  protected readonly latitude = signal<number | null>(null);
  protected readonly longitude = signal<number | null>(null);
  protected readonly confirmarCancelamento = signal(false);

  protected readonly editando = computed(() => !!this.id());
  protected readonly bloqueada = computed(() => !!this.carga() && this.carga()!.status !== 'AGUARDANDO_ROTA');

  protected readonly form = this.fb.group({
    descricao: ['', [Validators.required, Validators.maxLength(200)]],
    pesoKg: [null as number | null, [Validators.required, Validators.min(0.01)]],
    volumeM3: [null as number | null, [Validators.required, Validators.min(0.001)]],
    destinatarioNome: ['', [Validators.required, Validators.maxLength(150)]],
    destinatarioTelefone: ['', Validators.pattern(/^[\d\s()+-]{10,20}$/)],
    cep: ['', Validators.pattern(/^\d{5}-?\d{3}$/)],
    endereco: ['', [Validators.required, Validators.maxLength(200)]],
    bairro: ['', [Validators.required, Validators.maxLength(80)]],
    cidade: ['Fortaleza', [Validators.required, Validators.maxLength(80)]],
    uf: ['CE', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    clienteMatricula: [''],
  });

  ngOnInit(): void {
    this.clientesApi.listar().subscribe({
      next: p => {
        this.empresas.set(p.content);
        const pedida = this.empresa();
        if (pedida && !this.id()) this.escolherEmpresa(pedida);
      },
    });
    const id = this.id();
    if (!id) {
      this.usuariosApi.entregadores('ATIVO').subscribe({ next: p => this.entregadores.set(p.content) });
      this.veiculosApi.listar({ status: 'ATIVO', size: 100, sort: 'placa' }).subscribe({ next: p => this.veiculos.set(p.content) });
      for (const status of ['PLANEJADA', 'EM_ANDAMENTO'] as const) {
        this.rotasApi.listar({ status, size: 100 }).subscribe({ next: p => this.rotasAtivas.update(rs => [...rs, ...p.content]) });
      }
      return;
    }
    this.api.buscar(Number(id)).subscribe({
      next: c => {
        this.carga.set(c);
        this.form.patchValue({ ...c, destinatarioTelefone: c.destinatarioTelefone ?? '', cep: c.cep ?? '', clienteMatricula: c.clienteMatricula ?? '' });
        this.clienteMatricula.set(c.clienteMatricula ?? '');
        this.latitude.set(c.latitude);
        this.longitude.set(c.longitude);
        if (c.status !== 'AGUARDANDO_ROTA') this.form.disable();
      },
      error: e => this.erro.set(erroApi(e).mensagem),
    });
  }

  /** Escolheu a empresa: o destino vem do cadastro dela (dá para ajustar depois). Vazio = destinatário avulso. */
  protected escolherEmpresa(matricula: string): void {
    this.form.controls.clienteMatricula.setValue(matricula);
    this.form.controls.clienteMatricula.markAsDirty();
    this.clienteMatricula.set(matricula);
    const e = this.empresas().find(x => x.matricula === matricula);
    if (!e) return;
    this.form.patchValue({ destinatarioNome: e.nome, destinatarioTelefone: e.telefone ?? '' });
    if (e.endereco && e.latitude !== null && e.longitude !== null) {
      this.form.patchValue({ cep: e.cep ?? '', endereco: e.endereco, bairro: e.bairro ?? '', cidade: e.cidade ?? '', uf: e.uf ?? '' });
      this.latitude.set(e.latitude);
      this.longitude.set(e.longitude);
    }
  }

  protected buscarCep(): void {
    const cep = this.form.controls.cep.value;
    this.buscandoCep.set(true);
    this.enderecos.porCep(cep).subscribe({
      next: r => {
        this.buscandoCep.set(false);
        if (!r) { this.avisos.erro('CEP não encontrado.'); return; }
        this.form.patchValue({ endereco: r.endereco ? `${r.endereco}, ` : '', bairro: r.bairro, cidade: r.cidade, uf: r.uf });
        this.form.controls.endereco.markAsDirty();
        document.getElementById('cf-endereco')?.focus();
      },
      error: () => { this.buscandoCep.set(false); this.avisos.erro('Não deu para consultar o CEP agora.'); },
    });
  }

  protected localizar(): void {
    const v = this.form.getRawValue();
    if (!v.endereco || !v.cidade) { this.avisos.info('Preencha endereço e cidade para localizar.'); return; }
    this.localizando.set(true);
    this.enderecos.coordenadas(v.endereco, v.bairro, v.cidade, v.uf).subscribe({
      next: p => {
        this.localizando.set(false);
        if (!p) { this.avisos.info('Endereço não encontrado no mapa: marque o ponto tocando no mapa.'); return; }
        this.latitude.set(p.latitude);
        this.longitude.set(p.longitude);
      },
      error: () => { this.localizando.set(false); this.avisos.erro('Serviço de mapas indisponível: marque o ponto no mapa.'); },
    });
  }

  protected salvar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.erro.set('Confira os campos destacados.'); return; }
    if (this.latitude() === null || this.longitude() === null) { this.erro.set('Marque o local da entrega no mapa.'); return; }
    this.erro.set(null);
    this.salvando.set(true);

    const v = this.form.getRawValue();
    const dados: CargaForm = {
      descricao: v.descricao.trim(),
      pesoKg: Number(v.pesoKg),
      volumeM3: Number(v.volumeM3),
      destinatarioNome: v.destinatarioNome.trim(),
      destinatarioTelefone: v.destinatarioTelefone.replace(/\D/g, '') || null,
      endereco: v.endereco.trim().replace(/,\s*$/, ''),
      bairro: v.bairro.trim(),
      cidade: v.cidade.trim(),
      uf: v.uf.toUpperCase(),
      cep: v.cep.replace(/\D/g, '') || null,
      latitude: this.latitude()!,
      longitude: this.longitude()!,
      clienteMatricula: v.clienteMatricula || null,
    };

    const atual = this.carga();
    const pedido$ = atual ? this.api.atualizar(atual.id, this.diferencas(atual, dados)) : this.api.cadastrar(dados);
    pedido$.subscribe({
      next: c => {
        if (!atual && this.podeLevar()) { this.gerarRota(c); return; }
        this.avisos.sucesso(atual ? 'Carga atualizada.' : `Carga ${c.codigo} cadastrada.`);
        this.router.navigate(['/painel/cargas']);
      },
      error: e => {
        this.salvando.set(false);
        const err = erroApi(e);
        aplicarErrosDeCampo(this.form, err);
        this.erro.set(err.mensagem);
      },
    });
  }

  /** Rota ativa em que o entregador ou o veículo está (para mostrar ocupado na lista). */
  protected rotaDe(campo: 'entregadorMatricula' | 'veiculoId', valor: string | number): RotaResumo | undefined {
    return this.rotasAtivas().find(r => r[campo] === valor);
  }

  protected escolherEntregador(matricula: string): void {
    this.entregadorMatricula.set(matricula);
    // com rota planejada, o veículo é o da rota; trocando para outro entregador, solta o veículo que estava em uso
    const rota = this.rotaDoEntregador();
    const atual = this.veiculoId();
    this.veiculoId.set(rota ? rota.veiculoId : atual !== null && !this.rotaDe('veiculoId', atual) ? atual : null);
  }

  /**
   * Entregador escolhido: a carga entra na rota PLANEJADA dele (se já tem uma) ou sai numa rota nova só dela,
   * com o veículo escolhido. Ele vê em "Minhas rotas" no app.
   */
  private gerarRota(c: Carga): void {
    const entregador = this.entregadores().find(e => e.matricula === this.entregadorMatricula())?.nome ?? this.entregadorMatricula();
    const existente = this.rotaDoEntregador();
    const pedido$ = existente
      ? this.rotasApi.incluirCargas(existente.id, [c.id])
      : this.rotasApi.gerar({ veiculoId: this.veiculoId()!, entregadorMatricula: this.entregadorMatricula(), cargaIds: [c.id] });
    pedido$.subscribe({
      next: r => {
        this.avisos.sucesso(existente
          ? `Carga ${c.codigo} cadastrada e incluída na rota ${r.codigo} de ${entregador}.`
          : `Carga ${c.codigo} cadastrada e rota ${r.codigo} criada para ${entregador}.`);
        this.router.navigate(['/painel/rotas', r.id]);
      },
      error: e => {
        this.avisos.erro(`Carga ${c.codigo} cadastrada, mas não entrou em rota: ${erroApi(e).mensagem} Monte em Rotas.`);
        this.router.navigate(['/painel/cargas']);
      },
    });
  }

  /** PATCH só com o que mudou; se o destino mudou, vai o endereço inteiro (regra do back-end). */
  private diferencas(antes: Carga, depois: CargaForm): Partial<CargaForm> {
    const mud: Partial<CargaForm> = {};
    for (const k of ['descricao', 'pesoKg', 'volumeM3', 'destinatarioNome', 'destinatarioTelefone'] as const) {
      if ((antes[k] ?? null) !== (depois[k] ?? null)) (mud as Record<string, unknown>)[k] = depois[k];
    }
    // "" = desvincular a empresa (no PATCH, nulo significa "não mexe")
    if ((antes.clienteMatricula ?? null) !== (depois.clienteMatricula ?? null)) mud.clienteMatricula = depois.clienteMatricula ?? '';
    const destinoMudou = [...CAMPOS_ENDERECO, 'latitude', 'longitude'].some(k =>
      (antes[k as keyof Carga] ?? null) !== (depois[k as keyof CargaForm] ?? null));
    if (destinoMudou) {
      Object.assign(mud, { endereco: depois.endereco, bairro: depois.bairro, cidade: depois.cidade, uf: depois.uf,
        cep: depois.cep, latitude: depois.latitude, longitude: depois.longitude });
    }
    return mud;
  }

  protected cancelarCarga(): void {
    const c = this.carga();
    if (!c) return;
    this.confirmarCancelamento.set(false);
    this.api.atualizar(c.id, { status: 'CANCELADA' }).subscribe({
      next: () => { this.avisos.sucesso(`Carga ${c.codigo} cancelada.`); this.router.navigate(['/painel/cargas']); },
      error: e => this.avisos.erro(erroApi(e).mensagem),
    });
  }

  protected invalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.touched && c.invalid;
  }

  protected erroServidor(campo: string): string | null {
    return (this.form.get(campo)?.errors?.['servidor'] as string | undefined) ?? null;
  }
}

import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VeiculoPatch, VeiculosApi } from '../../core/api/veiculos.api';
import { AvisoService } from '../../core/aviso.service';
import { aplicarErrosDeCampo, erroApi } from '../../core/erro';
import { Combustivel, StatusVeiculo, TipoVeiculo, Veiculo } from '../../core/modelos';
import { COMBUSTIVEIS, ROTULOS, TIPOS_VEICULO } from '../../core/rotulos';

const PLACA = /^[A-Za-z]{3}-?\d[A-Za-z0-9]\d{2}$/;

/** Novo veículo (POST) ou edição (PATCH — placa, capacidades, consumo, km e status; RENAVAM/ano/tipo/combustível são fixos). */
@Component({
  selector: 'app-veiculo-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="conteudo" style="max-width:860px">
      <a class="voltar" [routerLink]="id() ? ['/painel/veiculos', id()] : '/painel/veiculos'"><span class="icone">arrow_back</span> {{ id() ? 'Veículo' : 'Frota' }}</a>
      <div class="cabecalho-pagina"><div><h1>{{ id() ? 'Editar ' + (veiculo()?.placa ?? '') : 'Novo veículo' }}</h1>
        <p>Capacidades limitam o que cabe numa rota; o consumo de referência alimenta os alertas do Financeiro.</p></div></div>

      <form [formGroup]="form" (ngSubmit)="salvar()" class="pilha-g" novalidate>
        <section class="card">
          <h2 class="card-titulo">Identificação</h2>
          <div class="form-grade">
            <div class="campo">
              <label for="vf-placa">Placa</label>
              <input id="vf-placa" class="entrada" formControlName="placa" placeholder="ABC1D23" maxlength="8" style="text-transform:uppercase">
              @if (inv('placa')) { <span class="erro">{{ srv('placa') ?? 'Placa inválida (ABC1234 ou ABC1D23).' }}</span> }
            </div>
            <div class="campo">
              <label for="vf-ren">RENAVAM <span class="texto-3">(opcional)</span></label>
              <input id="vf-ren" class="entrada" inputmode="numeric" formControlName="renavam" maxlength="11">
              @if (inv('renavam')) { <span class="erro">{{ srv('renavam') ?? 'O RENAVAM tem 11 dígitos.' }}</span> }
            </div>
            <div class="campo">
              <label for="vf-marca">Marca</label>
              <input id="vf-marca" class="entrada" formControlName="marca" placeholder="Fiat">
            </div>
            <div class="campo">
              <label for="vf-modelo">Modelo</label>
              <input id="vf-modelo" class="entrada" formControlName="modelo" placeholder="Fiorino Endurance 1.4">
            </div>
            <div class="campo">
              <label for="vf-tipo">Tipo</label>
              <select id="vf-tipo" class="entrada" formControlName="tipo">
                @for (t of tiposLista; track t) { <option [value]="t">{{ tipos[t].texto }}</option> }
              </select>
            </div>
            <div class="grade-2">
              <div class="campo">
                <label for="vf-ano">Ano</label>
                <input id="vf-ano" class="entrada" type="number" inputmode="numeric" formControlName="anoFabricacao">
              </div>
              <div class="campo">
                <label for="vf-comb">Combustível</label>
                <select id="vf-comb" class="entrada" formControlName="combustivel">
                  @for (c of combustiveis; track c) { <option [value]="c">{{ nomesCombustivel[c] }}</option> }
                </select>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <h2 class="card-titulo">Capacidade e uso</h2>
          <div class="form-grade">
            <div class="campo">
              <label for="vf-kg">Carga máxima (kg)</label>
              <input id="vf-kg" class="entrada" type="number" inputmode="decimal" formControlName="capacidadeCargaKg">
            </div>
            <div class="campo">
              <label for="vf-m3">Volume do baú (m³)</label>
              <input id="vf-m3" class="entrada" type="number" inputmode="decimal" step="0.01" formControlName="capacidadeVolumeM3">
            </div>
            <div class="campo">
              <label for="vf-ref">Consumo de referência (km/l) <span class="texto-3">(opcional)</span></label>
              <input id="vf-ref" class="entrada" type="number" inputmode="decimal" step="0.1" formControlName="consumoReferenciaKmPorLitro">
              <span class="dica">Média do fabricante ou histórico. Sem ela, não há alerta de consumo.</span>
            </div>
            <div class="campo">
              <label for="vf-km">Quilometragem atual</label>
              <input id="vf-km" class="entrada" type="number" inputmode="numeric" formControlName="quilometragemAtual">
              @if (srv('quilometragemAtual')) { <span class="erro">{{ srv('quilometragemAtual') }}</span> }
            </div>
            @if (id()) {
              <div class="campo">
                <label for="vf-status">Status</label>
                <select id="vf-status" class="entrada" formControlName="status">
                  @for (s of statusLista; track s) { <option [value]="s">{{ rotulosStatus[s].texto }}</option> }
                </select>
                <span class="dica">Só veículo ATIVO entra em rota.</span>
              </div>
            }
          </div>
        </section>

        @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
        <div class="barra-acao">
          <button class="btn btn-primario" type="submit" [disabled]="salvando()">
            @if (salvando()) { <span class="icone girando">progress_activity</span> } {{ id() ? 'Salvar alterações' : 'Cadastrar veículo' }}
          </button>
        </div>
      </form>
    </div>`,
})
export class VeiculoFormulario implements OnInit {
  private readonly api = inject(VeiculosApi);
  private readonly avisos = inject(AvisoService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly id = input<string>();

  protected readonly veiculo = signal<Veiculo | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly tipos = TIPOS_VEICULO;
  protected readonly tiposLista = Object.keys(TIPOS_VEICULO) as TipoVeiculo[];
  protected readonly combustiveis = Object.keys(COMBUSTIVEIS) as Combustivel[];
  protected readonly nomesCombustivel = COMBUSTIVEIS;
  protected readonly statusLista: StatusVeiculo[] = ['ATIVO', 'EM_MANUTENCAO', 'INATIVO'];
  protected readonly rotulosStatus = ROTULOS['veiculo'];

  protected readonly form = this.fb.group({
    placa: ['', [Validators.required, Validators.pattern(PLACA)]],
    renavam: ['', Validators.pattern(/^\d{11}$/)],
    marca: ['', Validators.required],
    modelo: ['', Validators.required],
    anoFabricacao: [new Date().getFullYear() as number | null, [Validators.required, Validators.min(1980)]],
    tipo: ['UTILITARIO' as TipoVeiculo, Validators.required],
    combustivel: ['FLEX' as Combustivel, Validators.required],
    capacidadeCargaKg: [null as number | null, [Validators.required, Validators.min(0.01)]],
    capacidadeVolumeM3: [null as number | null, [Validators.required, Validators.min(0.01)]],
    consumoReferenciaKmPorLitro: [null as number | null, Validators.min(0.01)],
    quilometragemAtual: [null as number | null, Validators.min(0)],
    status: ['ATIVO' as StatusVeiculo],
  });

  protected readonly editando = computed(() => !!this.id());

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // campos fixos depois do cadastro
    for (const c of ['renavam', 'anoFabricacao', 'tipo', 'combustivel'] as const) this.form.controls[c].disable();
    this.api.buscar(Number(id)).subscribe({
      next: v => { this.veiculo.set(v); this.form.patchValue({ ...v, renavam: v.renavam ?? '' }); },
      error: e => this.erro.set(erroApi(e).mensagem),
    });
  }

  protected salvar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.erro.set('Confira os campos destacados.'); return; }
    this.erro.set(null);
    this.salvando.set(true);
    const v = this.form.getRawValue();
    const num = (x: number | null) => (x === null || (x as unknown) === '' ? null : Number(x));
    const atual = this.veiculo();

    const mud = atual ? this.mudancas(atual, {
      placa: v.placa.toUpperCase().replace('-', ''), marca: v.marca.trim(), modelo: v.modelo.trim(),
      capacidadeCargaKg: num(v.capacidadeCargaKg)!, capacidadeVolumeM3: num(v.capacidadeVolumeM3)!,
      consumoReferenciaKmPorLitro: num(v.consumoReferenciaKmPorLitro), quilometragemAtual: num(v.quilometragemAtual), status: v.status,
    }) : null;
    if (atual && mud && !Object.keys(mud).length) {
      this.salvando.set(false);
      this.avisos.info('Nada mudou.');
      this.router.navigate(['/painel/veiculos', atual.id]);
      return;
    }

    const pedido$ = atual && mud
      ? this.api.atualizar(atual.id, mud)
      : this.api.cadastrar({
          placa: v.placa.toUpperCase().replace('-', ''), renavam: v.renavam || null, marca: v.marca.trim(), modelo: v.modelo.trim(),
          anoFabricacao: Number(v.anoFabricacao), tipo: v.tipo, combustivel: v.combustivel,
          capacidadeCargaKg: num(v.capacidadeCargaKg)!, capacidadeVolumeM3: num(v.capacidadeVolumeM3)!,
          consumoReferenciaKmPorLitro: num(v.consumoReferenciaKmPorLitro), quilometragemAtual: num(v.quilometragemAtual),
        });

    pedido$.subscribe({
      next: salvo => { this.avisos.sucesso(atual ? 'Veículo atualizado.' : `Veículo ${salvo.placa} cadastrado.`); this.router.navigate(['/painel/veiculos', salvo.id]); },
      error: e => { this.salvando.set(false); const err = erroApi(e); aplicarErrosDeCampo(this.form, err); this.erro.set(err.mensagem); },
    });
  }

  /** O back-end não aceita "apagar" consumo/km via PATCH: nulos não entram. */
  private mudancas(antes: Veiculo, depois: VeiculoPatch): VeiculoPatch {
    const m: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(depois)) {
      if (val !== null && val !== undefined && val !== antes[k as keyof Veiculo]) m[k] = val;
    }
    return m as VeiculoPatch;
  }

  protected inv(c: string) { const x = this.form.get(c); return !!x && x.touched && x.invalid; }
  protected srv(c: string) { return (this.form.get(c)?.errors?.['servidor'] as string | undefined) ?? null; }
}

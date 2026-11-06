import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientesApi } from '../../core/api/clientes.api';
import { EnderecoApi } from '../../core/api/endereco.api';
import { SessaoService } from '../../core/auth/sessao.service';
import { AvisoService } from '../../core/aviso.service';
import { cnpjValido } from '../../core/cnpj';
import { aplicarErrosDeCampo, erroApi } from '../../core/erro';
import { CodigoAtivacao, Permissao } from '../../core/modelos';
import { Mascara } from '../../shared/mascara';
import { MapaPonto } from '../../shared/mapa/mapa-ponto';
import { CodigoAtivacaoCartao } from '../usuarios/codigo-ativacao';

const validarCnpj = (c: AbstractControl): ValidationErrors | null => (!c.value || cnpjValido(c.value) ? null : { cnpj: true });

/**
 * Cadastro de empresa cliente (POST /clientes): dados da empresa, login do Portal do Cliente (e-mail) e o endereço,
 * que vira o destino padrão das entregas para ela. No fim mostra o código de ativação do login (uma vez só).
 */
@Component({
  selector: 'app-empresa-nova',
  imports: [ReactiveFormsModule, RouterLink, Mascara, MapaPonto, CodigoAtivacaoCartao],
  template: `
    <div class="conteudo" style="max-width:860px">
      <a class="voltar" routerLink="/painel/empresas"><span class="icone">arrow_back</span> Empresas</a>
      @if (criada(); as c) {
        <div class="pilha-g">
          <app-codigo-ativacao [dados]="c" />
          <div class="linha quebra" style="justify-content:center">
            @if (podeEntregar) {
              <a class="btn btn-primario" [routerLink]="['/painel/cargas/nova']" [queryParams]="{ empresa: c.matricula }">
                <span class="icone">local_shipping</span> Nova entrega para {{ c.nome }}</a>
            }
            <a class="btn btn-secundario" routerLink="/painel/empresas">Ver empresas</a>
          </div>
        </div>
      } @else {
        <div class="cabecalho-pagina"><div><h1>Nova empresa</h1>
          <p>A entrega vai para esta empresa e ela acompanha tudo pelo Portal do Cliente.</p></div></div>

        <form [formGroup]="form" (ngSubmit)="salvar()" class="pilha-g" novalidate>
          <section class="card">
            <h2 class="card-titulo">Empresa</h2>
            <div class="form-grade">
              <div class="campo inteiro">
                <label for="em-nome">Nome da empresa</label>
                <input id="em-nome" class="entrada" formControlName="nome" maxlength="150" placeholder="Academia Gaviões Ltda">
                @if (invalido('nome')) { <span class="erro">{{ erroServidor('nome') ?? 'Informe o nome.' }}</span> }
              </div>
              <div class="campo">
                <label for="em-cnpj">CNPJ</label>
                <input id="em-cnpj" class="entrada" mascara="cnpj" formControlName="cnpj" placeholder="12.345.678/0001-95">
                <span class="dica">Aceita o CNPJ novo, com letras.</span>
                @if (invalido('cnpj')) { <span class="erro">{{ erroServidor('cnpj') ?? 'CNPJ inválido: confira os números.' }}</span> }
              </div>
              <div class="campo">
                <label for="em-tel">Telefone <span class="texto-3">(opcional)</span></label>
                <input id="em-tel" class="entrada" type="tel" mascara="telefone" formControlName="telefone" placeholder="(85) 99999-0000">
                @if (invalido('telefone')) { <span class="erro">Telefone com DDD.</span> }
              </div>
              <div class="campo inteiro">
                <label for="em-email">E-mail (login do Portal do Cliente)</label>
                <input id="em-email" class="entrada" type="email" mascara="email" formControlName="email" placeholder="logistica@empresa.com.br">
                @if (invalido('email')) { <span class="erro">{{ erroServidor('email') ?? 'Informe um e-mail válido.' }}</span> }
              </div>
            </div>
          </section>

          <section class="card">
            <h2 class="card-titulo">Endereço de entrega</h2>
            <div class="form-grade">
              <div class="campo">
                <label for="em-cep">CEP</label>
                <div class="linha">
                  <input id="em-cep" class="entrada" mascara="cep" formControlName="cep" placeholder="60325-001">
                  <button class="btn btn-secundario" type="button" (click)="buscarCep()" [disabled]="buscandoCep()" aria-label="Buscar CEP">
                    <span class="icone" [class.girando]="buscandoCep()">{{ buscandoCep() ? 'progress_activity' : 'search' }}</span>
                  </button>
                </div>
              </div>
              <div class="campo">
                <label for="em-end">Endereço e número</label>
                <input id="em-end" class="entrada" formControlName="endereco" placeholder="Av. Bezerra de Menezes, 1496">
                @if (invalido('endereco')) { <span class="erro">Informe o endereço.</span> }
              </div>
              <div class="campo">
                <label for="em-bairro">Bairro</label>
                <input id="em-bairro" class="entrada" formControlName="bairro">
                @if (invalido('bairro')) { <span class="erro">Informe o bairro.</span> }
              </div>
              <div class="grade-2" style="grid-template-columns: 1fr 88px">
                <div class="campo"><label for="em-cid">Cidade</label><input id="em-cid" class="entrada" formControlName="cidade"></div>
                <div class="campo"><label for="em-uf">UF</label><input id="em-uf" class="entrada" mascara="uf" formControlName="uf"></div>
              </div>
            </div>
            <hr>
            <div class="linha-entre quebra" style="margin-bottom:10px">
              <div><div class="forte">Local no mapa</div>
                <div class="pequeno texto-2">@if (latitude() !== null) { {{ latitude() }}, {{ longitude() }} } @else { Onde o entregador vai parar. }</div></div>
              <button class="btn btn-secundario btn-pequeno" type="button" (click)="localizar()" [disabled]="localizando()">
                <span class="icone" [class.girando]="localizando()">{{ localizando() ? 'progress_activity' : 'travel_explore' }}</span> Localizar pelo endereço
              </button>
            </div>
            <app-mapa-ponto [(latitude)]="latitude" [(longitude)]="longitude" />
          </section>

          @if (erro()) { <div class="aviso erro"><span class="icone">error</span>{{ erro() }}</div> }
          <div class="barra-acao">
            <button class="btn btn-primario" type="submit" [disabled]="salvando()">
              @if (salvando()) { <span class="icone girando">progress_activity</span> } Cadastrar empresa
            </button>
          </div>
        </form>
      }
    </div>`,
})
export class EmpresaNova {
  private readonly api = inject(ClientesApi);
  private readonly enderecos = inject(EnderecoApi);
  private readonly avisos = inject(AvisoService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly podeEntregar = inject(SessaoService).tem(Permissao.ENTREGA_CADASTRAR);

  protected readonly criada = signal<CodigoAtivacao | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly buscandoCep = signal(false);
  protected readonly localizando = signal(false);
  protected readonly latitude = signal<number | null>(null);
  protected readonly longitude = signal<number | null>(null);

  protected readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    cnpj: ['', [Validators.required, validarCnpj]],
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', Validators.pattern(/^\d{10,11}$/)],
    cep: ['', Validators.pattern(/^\d{8}$/)],
    endereco: ['', Validators.required],
    bairro: ['', Validators.required],
    cidade: ['Fortaleza', Validators.required],
    uf: ['CE', [Validators.required, Validators.pattern(/^[A-Z]{2}$/)]],
  });

  protected buscarCep(): void {
    this.buscandoCep.set(true);
    this.enderecos.porCep(this.form.controls.cep.value).subscribe({
      next: r => {
        this.buscandoCep.set(false);
        if (!r) { this.avisos.erro('CEP não encontrado.'); return; }
        this.form.patchValue({ endereco: r.endereco ? `${r.endereco}, ` : '', bairro: r.bairro, cidade: r.cidade, uf: r.uf });
        document.getElementById('em-end')?.focus();
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
    if (this.latitude() === null || this.longitude() === null) { this.erro.set('Marque o local da empresa no mapa.'); return; }
    this.erro.set(null);
    this.salvando.set(true);
    const v = this.form.getRawValue();
    this.api.cadastrar({
      nome: v.nome.trim(), cnpj: v.cnpj, email: v.email, telefone: v.telefone || null, cep: v.cep || null,
      endereco: v.endereco.trim().replace(/,\s*$/, ''), bairro: v.bairro.trim(), cidade: v.cidade.trim(), uf: v.uf,
      latitude: this.latitude()!, longitude: this.longitude()!,
    }).subscribe({
      next: c => { this.salvando.set(false); this.criada.set(c); this.avisos.sucesso(`Empresa ${c.nome} cadastrada (${c.matricula}).`); },
      error: e => {
        this.salvando.set(false);
        const err = erroApi(e);
        aplicarErrosDeCampo(this.form, err);
        this.erro.set(err.mensagem);
      },
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

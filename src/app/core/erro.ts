import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';
import { ErroApi } from './modelos';

/** Extrai o ErroResponse do back-end (ou monta um equivalente para falhas de rede). */
export function erroApi(e: unknown): ErroApi {
  if (e instanceof HttpErrorResponse) {
    const corpo = e.error as Partial<ErroApi> | null;
    if (corpo && typeof corpo === 'object' && typeof corpo.mensagem === 'string') {
      return { campos: [], codigo: null, ...corpo } as ErroApi;
    }
    const mensagem = e.status === 0
      ? 'Sem conexão com o servidor. Verifique a internet (e se a API está no ar).'
      : e.status === 403 ? 'Você não tem permissão para isso.'
      : `Erro ${e.status} ao falar com o servidor.`;
    return { timestamp: '', status: e.status, erro: e.statusText, codigo: null, mensagem, caminho: e.url ?? '', campos: [] };
  }
  return { timestamp: '', status: 0, erro: 'Erro', codigo: null, mensagem: 'Algo deu errado. Tente de novo.', caminho: '', campos: [] };
}

/** Pendura os erros de campo (400) nos controles do formulário, com a mensagem do servidor. */
export function aplicarErrosDeCampo(form: FormGroup, erro: ErroApi): boolean {
  let aplicou = false;
  for (const c of erro.campos ?? []) {
    const controle: AbstractControl | null = form.get(c.campo);
    if (controle) {
      controle.setErrors({ ...(controle.errors ?? {}), servidor: c.mensagem });
      controle.markAsTouched();
      aplicou = true;
    }
  }
  return aplicou;
}

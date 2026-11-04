import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { aplicarErrosDeCampo, erroApi } from './erro';

describe('erroApi', () => {
  it('usa o ErroResponse do back-end quando vem no corpo', () => {
    const e = new HttpErrorResponse({ status: 422, error: { status: 422, codigo: null, mensagem: 'Veículo inativo.', campos: [] } });
    expect(erroApi(e).mensagem).toBe('Veículo inativo.');
  });

  it('explica falta de conexão (status 0)', () => {
    expect(erroApi(new HttpErrorResponse({ status: 0 })).mensagem).toContain('Sem conexão');
  });

  it('pendura o erro de campo no controle certo', () => {
    const form = new FormGroup({ placa: new FormControl('X') });
    const err = erroApi(new HttpErrorResponse({ status: 400, error: { mensagem: 'Inválido', campos: [{ campo: 'placa', mensagem: 'Placa inválida' }] } }));
    expect(aplicarErrosDeCampo(form, err)).toBe(true);
    expect(form.controls.placa.errors?.['servidor']).toBe('Placa inválida');
  });
});

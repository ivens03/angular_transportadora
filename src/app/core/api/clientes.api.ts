import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Cliente, CodigoAtivacao, NovaEmpresa, Pagina, StatusUsuario } from '../modelos';
import { parametros } from './consulta';

/** Empresas clientes: o Suporte/Administrativo cadastra e escolhe a empresa na nova entrega. */
@Injectable({ providedIn: 'root' })
export class ClientesApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.api}/clientes`;

  listar(status: StatusUsuario | null = null) {
    return this.http.get<Pagina<Cliente>>(this.url, { params: parametros({ status, size: 500 }) });
  }

  /** Devolve o código de ativação do login da empresa no Portal do Cliente (aparece uma vez só). */
  cadastrar(empresa: NovaEmpresa) {
    return this.http.post<CodigoAtivacao>(this.url, empresa);
  }
}

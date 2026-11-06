import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Tecnologia { nome: string; versao: string; papel: string; }
/** grupo 'uso' = caminho do dado quando alguém usa o sistema; 'entrega' = do código ao ar. */
export interface Camada { id: string; grupo: 'uso' | 'entrega'; nome: string; onde: string; papel: string; tecnologias: Tecnologia[]; }
export interface Passo { de: string; para: string; oque: string; }
export interface Fluxo { id: string; titulo: string; resumo: string; passos: Passo[]; }
export interface Ferramenta { nome: string; categoria: string; para: string; }
export interface Ambiente {
  perfil: string; java: string; springBoot: string; hibernate: string; banco: string; migracao: string;
  servidor: string; noArDesde: string; agora: string;
}
export interface Arquitetura { ambiente: Ambiente; camadas: Camada[]; fluxos: Fluxo[]; ferramentas: Ferramenta[]; }

/** "Como funciona" (perfil Desenvolvimento): o mesmo JSON que o app Android desenha. */
@Injectable({ providedIn: 'root' })
export class ArquiteturaApi {
  private readonly http = inject(HttpClient);

  buscar() {
    return this.http.get<Arquitetura>(`${environment.api}/arquitetura`);
  }
}

/** Camadas que aparecem num fluxo (para acender no desenho). */
export function camadasDoFluxo(f: Fluxo | null | undefined): Set<string> {
  return new Set(f ? f.passos.flatMap(p => [p.de, p.para]) : []);
}

/** Ferramentas agrupadas pela categoria, na ordem em que aparecem. */
export function porCategoria(fs: Ferramenta[]): { categoria: string; itens: Ferramenta[] }[] {
  const grupos = new Map<string, Ferramenta[]>();
  for (const f of fs) grupos.set(f.categoria, [...(grupos.get(f.categoria) ?? []), f]);
  return [...grupos].map(([categoria, itens]) => ({ categoria, itens }));
}

/** "há 2 h 5 min" a partir de duas datas ISO. */
export function tempoNoAr(desde: string, agora: string): string {
  const min = Math.max(0, Math.floor((Date.parse(agora) - Date.parse(desde)) / 60000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
}

import { HttpHeaders, HttpParams } from '@angular/common/http';

/** PATCH segue o JSON Merge Patch (RFC 7396): só vai o que mudou; null apaga. */
export const MERGE_PATCH = { headers: new HttpHeaders({ 'Content-Type': 'application/merge-patch+json' }) };

/** Monta query string ignorando vazios (o back-end trata ausente como "sem filtro"). */
export function parametros(valores: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor !== null && valor !== undefined && valor !== '') {
      p = p.set(chave, String(valor));
    }
  }
  return p;
}

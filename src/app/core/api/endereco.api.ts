import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

export interface EnderecoCep { endereco: string; bairro: string; cidade: string; uf: string; }

/**
 * Serviços públicos usados só no cadastro de carga (sem token da RotaCerta):
 *  - ViaCEP: CEP → logradouro/bairro/cidade/UF
 *  - Nominatim (OpenStreetMap): endereço → latitude/longitude
 */
@Injectable({ providedIn: 'root' })
export class EnderecoApi {
  private readonly http = inject(HttpClient);

  porCep(cep: string): Observable<EnderecoCep | null> {
    const so = cep.replace(/\D/g, '');
    if (so.length !== 8) return of(null);
    return this.http.get<{ erro?: boolean; logradouro: string; bairro: string; localidade: string; uf: string }>(
      `https://viacep.com.br/ws/${so}/json/`).pipe(
      map(r => r.erro ? null : { endereco: r.logradouro, bairro: r.bairro, cidade: r.localidade, uf: r.uf }));
  }

  coordenadas(endereco: string, bairro: string, cidade: string, uf: string): Observable<{ latitude: number; longitude: number } | null> {
    const q = [endereco, bairro, cidade, uf, 'Brasil'].filter(Boolean).join(', ');
    return this.http.get<{ lat: string; lon: string }[]>('https://nominatim.openstreetmap.org/search',
      { params: { q, format: 'json', limit: '1', countrycodes: 'br' } }).pipe(
      map(r => r[0] ? { latitude: +(+r[0].lat).toFixed(6), longitude: +(+r[0].lon).toFixed(6) } : null));
  }
}

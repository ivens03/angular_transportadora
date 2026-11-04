import { Injectable, signal } from '@angular/core';

export interface Aviso { id: number; texto: string; tipo: 'sucesso' | 'erro' | 'info'; }

/** Mensagens rápidas no rodapé (snackbar). */
@Injectable({ providedIn: 'root' })
export class AvisoService {
  private seq = 0;
  readonly avisos = signal<Aviso[]>([]);

  sucesso(texto: string) { this.mostrar(texto, 'sucesso'); }
  erro(texto: string) { this.mostrar(texto, 'erro', 6000); }
  info(texto: string) { this.mostrar(texto, 'info'); }

  fechar(id: number) {
    this.avisos.update(l => l.filter(a => a.id !== id));
  }

  private mostrar(texto: string, tipo: Aviso['tipo'], ms = 3500) {
    const id = ++this.seq;
    this.avisos.update(l => [...l.slice(-2), { id, texto, tipo }]);
    setTimeout(() => this.fechar(id), ms);
  }
}

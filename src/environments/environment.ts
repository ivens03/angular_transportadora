/** Produção: front servido no mesmo domínio da API (context-path /transportadora). */
export const environment = {
  producao: true,
  api: '/transportadora/api/v1',
  swagger: '/transportadora/swagger-ui.html',
  /** Botão que "anda" sozinho pelo trajeto (demonstração sem sair de casa). */
  simuladorGps: false,
  /** Envio das posições do entregador em lote. */
  gps: { intervaloEnvioMs: 15_000, distanciaMinimaM: 25, intervaloMinimoMs: 10_000 },
  /** Acompanhamento do Suporte: de quanto em quanto tempo atualiza o mapa. */
  acompanhamentoMs: 10_000,
};

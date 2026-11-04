/** Desenvolvimento: ng serve faz proxy de /transportadora_dev para a API em localhost:8085 (proxy.conf.json). */
export const environment = {
  producao: false,
  api: '/transportadora_dev/api/v1',
  swagger: '/transportadora_dev/swagger-ui.html',
  simuladorGps: true,
  gps: { intervaloEnvioMs: 5_000, distanciaMinimaM: 15, intervaloMinimoMs: 2_000 },
  acompanhamentoMs: 3_000,
};

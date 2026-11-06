/**
 * Tipos espelhando os DTOs da API (spring.transportadora).
 * Datas chegam como string ISO-8601; números decimais (BigDecimal) chegam como number.
 */

// ---------- comuns ----------
export interface Pagina<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface CampoErro { campo: string; mensagem: string; }

export interface ErroApi {
  timestamp: string;
  status: number;
  erro: string;
  codigo: string | null;
  mensagem: string;
  caminho: string;
  campos: CampoErro[];
}

export interface Ponto { latitude: number; longitude: number; }

// ---------- acesso ----------
export type Perfil = 'ENTREGADOR' | 'CLIENTE' | 'ADMINISTRATIVO' | 'SUPORTE' | 'FINANCEIRO' | 'DESENVOLVIMENTO';
export type TipoCredencial = 'APP_ENTREGADOR' | 'PAINEL_WEB';
export type Vinculo = 'EXTERNO' | 'CLIENTE' | 'INTERNO';
export type Departamento = 'ADMINISTRATIVO' | 'SUPORTE' | 'FINANCEIRO' | 'DESENVOLVIMENTO';
export type StatusUsuario = 'PENDENTE_ATIVACAO' | 'ATIVO' | 'BLOQUEADO';

export interface TokenResposta {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiraEm: string;
  matricula: string;
  perfil: Perfil;
  tipoCredencial: TipoCredencial;
  credencialExpiraEm: string;
}

export interface Sessao {
  matricula: string;
  nome: string;
  perfil: Perfil;
  tipoCredencial: TipoCredencial;
  modulo: string;
  permissoes: string[];
  expiraEm: string;
}

export interface CredencialResposta { matricula: string; tipoCredencial: TipoCredencial; expiraEm: string; }

/** Permissões do token (usuario/model/Permissoes.java). */
export const Permissao = {
  ENTREGA_VER_ATRIBUIDAS: 'entrega:ver-atribuidas',
  ENTREGA_ATUALIZAR_STATUS: 'entrega:atualizar-status',
  POSICAO_SINCRONIZAR: 'posicao:sincronizar',
  USUARIO_GERENCIAR: 'usuario:gerenciar',
  VEICULO_GERENCIAR: 'veiculo:gerenciar',
  ABASTECIMENTO_REGISTRAR: 'abastecimento:registrar',
  CONSUMO_VER_METRICAS: 'consumo:ver-metricas',
  ENTREGA_CADASTRAR: 'entrega:cadastrar',
  MAPA_ACOMPANHAR: 'mapa:acompanhar',
  MENSAGERIA_MONITORAR: 'mensageria:monitorar',
  DISPOSITIVO_CONSULTAR_LOGS: 'dispositivo:consultar-logs',
  CLIENTE_CADASTRAR: 'cliente:cadastrar',
  ENCOMENDA_ACOMPANHAR: 'encomenda:acompanhar',
  WEBHOOK_GERENCIAR: 'webhook:gerenciar',
} as const;

// ---------- usuários ----------
export interface Usuario {
  matricula: string;
  nome: string;
  email: string | null;
  vinculo: Vinculo;
  departamento: Departamento | null;
  perfil: Perfil;
  tipoCredencial: TipoCredencial;
  modulo: string;
  status: StatusUsuario;
  ultimoLoginEm: string | null;
  criadoEm: string;
}

export interface CodigoAtivacao {
  matricula: string;
  nome: string;
  vinculo: Vinculo;
  departamento: Departamento | null;
  perfil: Perfil;
  tipoCredencial: TipoCredencial;
  modulo: string;
  codigoAtivacao: string;
  codigoExpiraEm: string;
  instrucao: string;
}

export interface Entregador { matricula: string; nome: string; status: StatusUsuario; }

// ---------- frota ----------
export type TipoVeiculo = 'MOTO' | 'CARRO' | 'UTILITARIO' | 'VAN' | 'VUC' | 'CAMINHAO';
export type StatusVeiculo = 'ATIVO' | 'EM_MANUTENCAO' | 'INATIVO';
export type Combustivel = 'GASOLINA' | 'ETANOL' | 'FLEX' | 'DIESEL';
export type SituacaoConsumo = 'DENTRO_DO_ESPERADO' | 'CONSUMO_ACIMA_DO_ESPERADO' | 'SEM_REFERENCIA' | 'DADOS_INSUFICIENTES';

export interface Veiculo {
  id: number;
  placa: string;
  renavam: string | null;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  tipo: TipoVeiculo;
  combustivel: Combustivel;
  capacidadeCargaKg: number;
  capacidadeVolumeM3: number;
  consumoReferenciaKmPorLitro: number | null;
  quilometragemAtual: number | null;
  status: StatusVeiculo;
  cadastradoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Abastecimento {
  id: number;
  veiculoId: number;
  dataHora: string;
  odometroKm: number;
  litros: number;
  valorTotal: number | null;
  precoLitro: number | null;
  combustivel: Combustivel;
  posto: string | null;
  registradoPor: string;
  criadoEm: string;
}

export interface MetricaConsumo {
  veiculoId: number;
  placa: string;
  modelo: string;
  tipo: TipoVeiculo;
  inicio: string;
  fim: string;
  quantidadeAbastecimentos: number;
  kmRodados: number;
  litrosAbastecidos: number;
  gastoTotal: number | null;
  precoMedioLitro: number | null;
  consumoMedioKmPorLitro: number | null;
  custoPorKm: number | null;
  consumoReferenciaKmPorLitro: number | null;
  desvioPercentual: number | null;
  situacao: SituacaoConsumo;
}

export interface MetricaFrota {
  inicio: string;
  fim: string;
  veiculosAbastecidos: number;
  veiculosComConsumoAcimaDoEsperado: number;
  kmRodados: number;
  litrosAbastecidos: number;
  gastoTotal: number | null;
  consumoMedioKmPorLitro: number | null;
  custoPorKm: number | null;
  veiculos: MetricaConsumo[];
}

// ---------- cargas ----------
export type StatusCarga = 'AGUARDANDO_ROTA' | 'ROTEIRIZADA' | 'EM_TRANSITO' | 'ENTREGUE' | 'CANCELADA';

export interface Carga {
  id: number;
  codigo: string;
  descricao: string;
  pesoKg: number;
  volumeM3: number;
  destinatarioNome: string;
  destinatarioTelefone: string | null;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string | null;
  latitude: number;
  longitude: number;
  status: StatusCarga;
  tentativasEntrega: number;
  /** Empresa cliente dona da entrega (acompanha no Portal do Cliente); nula = destinatário avulso. */
  clienteMatricula: string | null;
  clienteNome: string | null;
  cadastradaPor: string;
  criadaEm: string;
  atualizadaEm: string;
}

export type CargaForm = Omit<Carga, 'id' | 'codigo' | 'status' | 'tentativasEntrega' | 'cadastradaPor' | 'criadaEm' | 'atualizadaEm'
  | 'clienteMatricula' | 'clienteNome'> & {
  /** Matrícula da empresa (CLI-…); no PATCH, "" desvincula. */
  clienteMatricula?: string | null;
};

// ---------- empresas clientes (GET/POST /clientes) ----------
export interface Cliente {
  matricula: string;
  nome: string;
  email: string;
  status: StatusUsuario;
  /** Sem pontuação; pode ter letras (CNPJ alfanumérico). Nulo em cliente antigo (sem dados da empresa). */
  cnpj: string | null;
  telefone: string | null;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface NovaEmpresa {
  nome: string;
  cnpj: string;
  email: string;
  telefone: string | null;
  cep: string | null;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: number;
  longitude: number;
}

// ---------- rotas ----------
export type StatusRota = 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
export type StatusParada = 'PENDENTE' | 'ENTREGUE' | 'NAO_ENTREGUE';

export interface Parada {
  ordem: number;
  cargaId: number;
  cargaCodigo: string;
  descricao: string;
  pesoKg: number;
  destinatarioNome: string;
  destinatarioTelefone: string | null;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: number;
  longitude: number;
  distanciaDoAnteriorKm: number;
  status: StatusParada;
  motivo: string | null;
  finalizadaEm: string | null;
}

export interface Posicao {
  latitude: number;
  longitude: number;
  registradaEm: string;
  velocidadeKmH: number | null;
  precisaoM: number | null;
  recebidaEm: string;
}

export interface Progresso { totalParadas: number; entregues: number; naoEntregues: number; pendentes: number; percentual: number; }

export interface Rota {
  id: number;
  codigo: string;
  status: StatusRota;
  veiculoId: number;
  veiculoPlaca: string;
  veiculoModelo: string;
  entregadorMatricula: string;
  entregadorNome: string;
  origemLatitude: number;
  origemLongitude: number;
  retornaOrigem: boolean;
  distanciaEstimadaKm: number;
  duracaoEstimadaMin: number;
  pesoTotalKg: number;
  volumeTotalM3: number;
  paradas: Parada[];
  trajeto: Ponto[];
  progresso: Progresso;
  proximaParada: number | null;
  ultimaPosicao: Posicao | null;
  distanciaAteProximaParadaKm: number | null;
  minutosAteProximaParada: number | null;
  criadaPor: string;
  criadaEm: string;
  iniciadaEm: string | null;
  concluidaEm: string | null;
  canceladaEm: string | null;
}

export interface RotaResumo {
  id: number;
  codigo: string;
  status: StatusRota;
  veiculoId: number;
  veiculoPlaca: string;
  entregadorMatricula: string;
  entregadorNome: string;
  totalParadas: number;
  paradasBaixadas: number;
  distanciaEstimadaKm: number;
  duracaoEstimadaMin: number;
  criadaEm: string;
  iniciadaEm: string | null;
  concluidaEm: string | null;
}

export interface NovaPosicao {
  latitude: number;
  longitude: number;
  registradaEm: string;
  velocidadeKmH?: number | null;
  precisaoM?: number | null;
}

export interface LotePosicoesResposta { recebidas: number; gravadas: number; duplicadas: number; }

// ---------- portal do cliente (encomenda/dto/response) ----------
/** A carga como o cliente vê (sem peso, quem cadastrou etc.). */
export interface EncomendaResumo {
  codigo: string;
  descricao: string;
  status: StatusCarga;
  destinatarioNome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string | null;
  latitude: number;
  longitude: number;
  tentativasEntrega: number;
  criadaEm: string;
  atualizadaEm: string;
}

export interface LocalizacaoVeiculo {
  latitude: number;
  longitude: number;
  velocidadeKmH: number | null;
  registradaEm: string;
  /** Rua pela posição (OpenStreetMap); nula quando o mapa não sabe. */
  rua: string | null;
  bairro: string | null;
}

/** Só existe com a encomenda numa rota. Localização e previsão só com ela a caminho. */
export interface Rastreio {
  rotaCodigo: string;
  rotaStatus: StatusRota;
  entregador: string;
  veiculoModelo: string;
  veiculoPlaca: string;
  ordemParada: number;
  /** Entregas pendentes antes da sua (0 = é a próxima). */
  entregasAntes: number | null;
  localizacao: LocalizacaoVeiculo | null;
  distanciaKm: number | null;
  previsaoMinutos: number | null;
  previsaoChegadaEm: string | null;
  entregueEm: string | null;
}

export interface EventoEncomenda {
  tipo: string;
  descricao: string;
  rotaCodigo: string | null;
  detalhe: string | null;
  ocorridoEm: string;
}

export interface Encomenda {
  encomenda: EncomendaResumo;
  rastreio: Rastreio | null;
  eventos: EventoEncomenda[];
}

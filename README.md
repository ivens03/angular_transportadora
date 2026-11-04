# RotaCerta — front-end (Angular)

Telas do RotaCerta para o **app do entregador** (celular) e o **painel da empresa** (Suporte, Administrativo,
Financeiro, Desenvolvimento). Consome a API do projeto irmão [`spring.transportadora`](../spring.transportadora).

- Angular 22 (standalone, signals, sem zone.js), TypeScript 6, SCSS próprio (sem biblioteca de UI)
- Leaflet + OpenStreetMap para os mapas
- **Mobile first**: todo estilo-base é o do celular; tablet/desktop entram por `@media (min-width: …)`
- Visual inspirado em marketplace: cabeçalho amarelo, fundo cinza-claro, cartões brancos, ação principal azul, sucesso em verde

## Como rodar

Pré-requisitos: Node **24.15+** (o `.tool-versions` fixa 24.22.2 para o asdf) e a API no ar em `localhost:8085`.

```bash
npm install
npm start            # http://localhost:4200 — o proxy manda /transportadora_dev para a API (proxy.conf.json)
npm test -- --watch=false
npm run build        # produção em dist/ (API esperada em /transportadora no mesmo domínio)
```

No IntelliJ: abra a pasta e use a configuração **Front (ng serve)** (pasta `.run/`).

**Testar no celular** (mesma rede Wi-Fi): `npm run start:celular` e abra `https://IP-DA-MAQUINA:4200`.
O GPS do navegador só funciona em HTTPS (ou localhost) — por isso o `--ssl`; aceite o aviso do certificado.

Para entrar, use as contas fixas de teste do perfil dev (dados no `.env` da API): o entregador entra pela aba
**Sou entregador** (matrícula + PIN) e os funcionários pela aba **Sou da empresa** (e-mail + senha).

## O que cada perfil vê

| Perfil | Onde | Telas |
|---|---|---|
| Entregador | `/app` | minhas rotas, execução da rota (mapa, próxima entrega, baixa, GPS), conta |
| Suporte | `/painel` | cargas (cadastro com CEP e ponto no mapa), montar rota, acompanhar rota ao vivo, frota |
| Administrativo | `/painel` | usuários (cadastro + código de ativação, bloqueio, novo código), frota |
| Financeiro | `/painel` | consumo da frota (km/l, R$/km, alertas), frota e abastecimentos |
| Desenvolvimento | `/painel` | monitoramento (saúde/latência da API, Swagger) |

O menu e as rotas usam **as mesmas permissões do token** que o `SecurityConfig` da API exige — quem não tem a
permissão nem vê o item (e, se digitar a URL, volta para o início).

## Fluxo principal

1. **Suporte** cadastra cargas (CEP preenche o endereço via ViaCEP; "Localizar" acha o ponto via OpenStreetMap; o pino pode ser arrastado).
2. **Suporte** monta a rota: escolhe as cargas → veículo (barras de capacidade de peso/volume) e entregador → revisa → **Gerar rota**. A ordem das paradas vem da API.
3. **Entregador** abre a rota no app e toca **Iniciar rota**: o GPS liga e as posições vão em lote para a API
   (fila no `localStorage`: sem sinal, nada se perde; reenvio é seguro).
4. A cada parada: **Entregue** ou **Não consegui entregar** (com motivo). A última baixa conclui a rota.
5. **Suporte** acompanha no mapa: trajeto planejado (tracejado), percurso real (azul), posição atual e progresso,
   atualizando sozinho a cada poucos segundos.

> No perfil dev, a tela da rota tem **Simular deslocamento (demo)**: o "carro" anda pelo trajeto e espera em cada
> parada até a baixa — bom para apresentar sem sair de casa. Some no build de produção (`environment.simuladorGps`).

## Estrutura

```
src/app/
  core/                 regras e acesso a dados (sem tela)
    api/                um serviço por recurso da API (cargas, rotas, veículos, usuários, autenticação, endereço)
    auth/               sessão (signals + localStorage), interceptor do token, guards
    modelos.ts          tipos espelhando os DTOs da API
    erro.ts             lê o ErroResponse da API e pendura erros de campo no formulário
    rotulos.ts          textos/cores dos enums (status, tipos, perfis)
  shared/               componentes reutilizáveis (etiqueta de status, mapa, folha inferior, paginação, vazio…)
  layout/               casca do painel (cabeçalho, menu) e do app (navegação inferior)
  features/             uma pasta por área: acesso, entregador, inicio, cargas, rotas, veiculos, consumo, usuarios, conta, monitoramento
src/styles.scss         design system (cores, botões, campos, cartões, listas) — mobile first
src/environments/       URL da API e ajustes de GPS por ambiente
```

## Conceitos de Angular usados (para quem está começando)

- **Componente standalone** — cada tela é uma classe com `@Component({ imports: [...] })`; não existe NgModule.
  O componente declara no `imports` o que usa no template (ex.: `RouterLink`, `DecimalPipe`).
- **Signals** — `signal(valor)` guarda estado; ler é chamar `x()`, mudar é `x.set(...)`/`x.update(...)`.
  `computed(() => ...)` deriva valores e se recalcula sozinho; `effect(() => ...)` roda efeitos quando um signal lido muda
  (ex.: o mapa redesenha quando as paradas mudam). Sem zone.js, é assim que a tela sabe o que atualizar.
- **`input()` / `output()` / `model()`** — entradas e saídas de componentes. `model()` é mão dupla:
  `<app-mapa-ponto [(latitude)]="lat" />`.
- **Parâmetros de rota como `input()`** — com `withComponentInputBinding()` (em `app.config.ts`), o `:id` da URL e os
  `?status=` chegam direto como `input()` do componente. Os filtros das listas moram na URL: dá para compartilhar o link.
- **Lazy loading** — cada tela é carregada sob demanda (`loadComponent` em `app.routes.ts`): o celular baixa só o que usa.
- **Guards** (`core/auth/guardas.ts`) — funções que decidem se uma rota abre (`soEntregador`, `soPainel`, `comPermissao`).
- **Interceptor** (`core/auth/token.interceptor.ts`) — põe `Authorization: Bearer` em toda chamada à API e, num 401, encerra a sessão.
- **Reactive Forms tipados** — `FormBuilder.nonNullable.group({...})` com validadores iguais aos do back-end; os erros
  de campo que a API devolve (400) aparecem embaixo do campo certo.
- **Control flow** — `@if`, `@for (x of lista; track x.id)`, `@switch` direto no template.

## Decisões

- **PATCH com `application/merge-patch+json`** e só com o que mudou (padrão REST da API; nunca PUT).
- **Token no `localStorage`**: o entregador não perde a sessão ao bloquear o celular. A sessão expira com o token (12 h app / 8 h painel).
- **PIN/senha vencido** (403 `CREDENCIAL_EXPIRADA`) leva direto para a troca obrigatória.
- **Proxy no `ng serve`** em vez de CORS na API: em produção o front é servido no mesmo domínio da API.
- **Mapas sem chave**: tiles do OpenStreetMap (com atribuição). Para produção com muito acesso, trocar por um provedor com chave em `shared/mapa/leaflet.ts`.

# RotaCerta — front-end (Angular)

Telas do RotaCerta para o **app do entregador** (celular), o **painel da empresa** (Suporte, Administrativo,
Financeiro, Desenvolvimento) e o **Portal do Cliente** (acompanhar as próprias encomendas). Consome a API do projeto irmão [`spring.transportadora`](../spring.transportadora).

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
**Sou entregador** (matrícula + PIN), os funcionários pela aba **Sou da empresa** e o cliente pela aba
**Sou cliente** (as duas com e-mail + senha; a API diz o perfil e o front leva cada um para a sua área).

## Deploy (Dokploy, a cada push na `main`)

No ar em **https://rotacerta.137-131-162-187.sslip.io**, numa VPS com [Dokploy](https://dokploy.com). A cada push
na `main`, o GitHub avisa o Dokploy (webhook), que clona o repositório e faz o `docker build` com o `Dockerfile`
daqui:

1. **build**: `node:24` roda `npm ci` + `ng build` (configuração production, API em `/transportadora`);
2. **execução**: `nginx:alpine` serve o `dist/` com o [`nginx.conf`](nginx.conf). Rota do Angular que não é
   arquivo (`/rotas/12`) volta para o `index.html`, os arquivos com hash ficam em cache por 1 ano e o
   `index.html` nunca fica em cache (depois de um deploy, o navegador pega a versão nova).

A API **não** passa por este Nginx: o Traefik do servidor manda `/transportadora/**` direto para o container da
API e o resto para cá. Mesmo domínio, então não precisa de CORS. Detalhes no README do
[`spring.transportadora`](../spring.transportadora).

## O que cada perfil vê

| Perfil | Onde | Telas |
|---|---|---|
| Entregador | `/app` | minhas rotas, execução da rota (mapa, próxima entrega, baixa, GPS), conta |
| Cliente | `/cliente` | minhas encomendas em três blocos — **a caminho agora** (rua do entregador, quanto falta, quantas entregas antes da sua), **vão ser entregues** e **já entregues** — e o rastreio com o entregador andando no mapa |
| Suporte | `/painel` | **empresas** clientes (cadastro com CNPJ, inclusive o alfanumérico, e endereço de entrega), **nova entrega** para uma empresa já escolhendo entregador e veículo, montar rota, acompanhar rota ao vivo, frota |
| Administrativo | `/painel` | usuários (cadastro + código de ativação, bloqueio, novo código), frota |
| Financeiro | `/painel` | consumo da frota (km/l, R$/km, alertas), frota e abastecimentos |
| Desenvolvimento | `/painel` | monitoramento (saúde/latência da API, Swagger) e **Como funciona** (`/painel/como-funciona`): o caminho do dado do app à VPS — escolha um fluxo e as caixas por onde ele passa acendem; toque numa caixa para ver frameworks e versões; o servidor mostra Java, Spring Boot, Hibernate, Postgres e a última migração medidos na hora. Tudo vem de `GET /arquitetura`, o mesmo que o app desenha |

O menu e as rotas usam **as mesmas permissões do token** que o `SecurityConfig` da API exige — quem não tem a
permissão nem vê o item (e, se digitar a URL, volta para o início).

## Fluxo principal

1. **Suporte** cadastra a **empresa** cliente (`/painel/empresas/nova`): nome, CNPJ (aceita o novo, com letras —
   `12.ABC.345/01DE-35`; os dígitos verificadores são conferidos na tela e na API), e-mail de login do portal,
   telefone e endereço de entrega (CEP preenche via ViaCEP; "Localizar" acha o ponto via OpenStreetMap). Sai um
   **código de ativação**, mostrado uma vez só, para a empresa criar a senha em "Primeiro acesso".
2. **Suporte** cria a **nova entrega** (`/painel/cargas/nova`): escolhe a empresa (o destino vem do endereço dela),
   diz o que vai (descrição, peso, volume) e, se quiser, **quem leva** (entregador e veículo). Com os dois escolhidos,
   o botão vira **Cadastrar e gerar rota**: a carga é salva e a rota com ela sai pronta, já no app do entregador.
   Se o entregador **já tem rota que ainda não saiu**, a entrega entra nela (com o veículo dela) e a ordem das
   paradas é recalculada — o botão vira **Cadastrar e incluir na ROT-…**. Entregador já na rua e veículo em uso
   em outra rota aparecem desabilitados na lista.
   Sem eles, a carga fica *aguardando rota* para o passo seguinte.
   Também dá para criar carga avulsa, sem empresa (destinatário digitado), como antes.
3. **Suporte** monta a rota (quando juntou várias entregas): escolhe as cargas → veículo (barras de capacidade de peso/volume) e entregador → revisa → **Gerar rota**. A ordem das paradas vem da API.
4. **Entregador** abre a rota no app e toca **Iniciar rota**: o GPS liga e as posições vão em lote para a API
   (fila no `localStorage`: sem sinal, nada se perde; reenvio é seguro).
5. A cada parada: **Entregue** ou **Não consegui entregar** (com motivo). A última baixa conclui a rota.
6. **Suporte** acompanha no mapa: trajeto planejado (tracejado), percurso real (azul), posição atual e progresso,
   atualizando sozinho a cada poucos segundos.
7. **Cliente** acompanha no Portal (`/cliente`): com a encomenda a caminho, vê o veículo andando no mapa, a rua e o
   bairro onde ele está ("Na Avenida João Pessoa, Montese"), quanto falta e a hora prevista; depois, ela passa
   para "Já entregues" com a hora da entrega. A tela se atualiza sozinha.

> **Privacidade no Portal do Cliente:** o mapa mostra só o destino do cliente, o veículo e o rastro que ele fez
> enquanto a tela está aberta, nunca a rota inteira (ela passa pelo endereço de outros clientes). A API já
> filtra: encomenda de outro cliente responde 404.

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
  layout/               casca do painel (cabeçalho, menu), do app (navegação inferior) e do portal do cliente
  features/             uma pasta por área: acesso, entregador, cliente, inicio, cargas, rotas, veiculos, consumo, usuarios, conta, monitoramento, como-funciona, empresas
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
- **Guards** (`core/auth/guardas.ts`) — funções que decidem se uma rota abre (`soEntregador`, `soPainel`, `soCliente`, `comPermissao`).
- **Interceptor** (`core/auth/token.interceptor.ts`) — põe `Authorization: Bearer` em toda chamada à API e, num 401, encerra a sessão.
- **Reactive Forms tipados** — `FormBuilder.nonNullable.group({...})` com validadores iguais aos do back-end; os erros
  de campo que a API devolve (400) aparecem embaixo do campo certo.
- **Control flow** — `@if`, `@for (x of lista; track x.id)`, `@switch` direto no template.

## Decisões

- **Máscara em todo campo com formato** (`shared/mascara.ts` + regras em `core/mascaras.ts`): CEP `00000-000`,
  telefone `(85) 99999-0000`, placa (`ABC1234`/`ABC1D23`, letra ou número em cada posição), RENAVAM (11 números), UF,
  PIN (6 números), código de ativação, matrícula (`ent000001` → `ENT-000001`), e-mail (sem espaço, minúsculo) e
  números (`15.230`, `1.250,50` com vírgula). O que não cabe no formato nem aparece no campo. A diretiva é um
  **ControlValueAccessor** (a ponte entre o `<input>` e o formulário): o campo mostra o texto formatado e o
  formulário guarda o valor limpo que a API espera (CEP `60325001`, peso `1250.5` como número). Uso: `<input mascara="cep" formControlName="cep">`.
- **PATCH com `application/merge-patch+json`** e só com o que mudou (padrão REST da API; nunca PUT).
- **Token no `localStorage`**: o entregador não perde a sessão ao bloquear o celular. A sessão expira com o token (12 h app / 8 h painel).
- **PIN/senha vencido** (403 `CREDENCIAL_EXPIRADA`) leva direto para a troca obrigatória.
- **Proxy no `ng serve`** em vez de CORS na API: em produção o front é servido no mesmo domínio da API.
- **Mapas sem chave**: tiles do OpenStreetMap (com atribuição). Para produção com muito acesso, trocar por um provedor com chave em `shared/mapa/leaflet.ts`.

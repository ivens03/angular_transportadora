# 0001. Adotar Angular standalone para a interface web do RotaCerta

* **Status:** Aceito
* **Data:** 2026-11-07

## Contexto
O RotaCerta precisa oferecer, em uma interface web, fluxos diferentes para entregadores, clientes e equipes internas (Suporte, Administrativo, Financeiro e Desenvolvimento). Essas interfaces precisam consumir a API do backend, controlar acesso conforme o perfil autenticado e apresentar informações geográficas e de acompanhamento de entregas. A experiência também precisa funcionar em telas pequenas e grandes.

## Decisão
Adotar **Angular 22 com componentes standalone, TypeScript e arquitetura organizada por funcionalidades**, usando `core/` para serviços transversais (API, autenticação, modelos e utilitários) e `features/` para as telas de cada área. Utilizar **signals**, roteamento com guardas, interceptor para autenticação, estilos **SCSS mobile-first** e **Leaflet com OpenStreetMap** para mapas. A interface consome a API Spring Boot, sem implementar as regras de autorização apenas no cliente.

## Alternativas Consideradas
* **Angular com NgModules:** Abordagem possível, mas adicionaria uma camada de organização não utilizada pela implementação standalone existente.
* **React ou Vue:** Alternativas viáveis para interfaces reativas, mas exigiriam outra organização de componentes, rotas e serviços em relação à base Angular já implementada.
* **Biblioteca visual pronta:** Poderia acelerar a criação de componentes, mas a implementação atual opta por SCSS próprio, permitindo controle direto da identidade visual.

## Consequências
* **Positivas:**
  * Reutilização de serviços de autenticação, acesso à API e modelos entre diferentes áreas.
  * Separação das telas por funcionalidades e perfis, facilitando a manutenção.
  * Interface responsiva com componentes standalone e mapas integrados.
* **Negativas:**
  * Necessidade de manter coerência entre permissões exibidas no frontend e autorizações efetivas no backend.
  * Manutenção de estilos e componentes próprios sem uma biblioteca de UI completa.
  * Dependência da API para operações e informações de rastreamento.
  * Curva de aprendizado elevada: a arquitetura do Angular, incluindo componentes, injeção de dependências.
  * Maior complexidade na manutenção dos estilos: o uso excessivo de aninhamentos, variáveis e mixins pode dificultar a leitura.


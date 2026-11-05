# syntax=docker/dockerfile:1
# Imagem do painel web RotaCerta. Usada pelo Dokploy (deploy a cada push na main).
# A API NÃO passa por aqui: o Traefik do servidor manda /transportadora/** direto para o container da API,
# e todo o resto (/, /login, /rotas/...) chega neste Nginx.

# 1) build: gera o site estático (configuração production -> environment.ts, API em /transportadora)
FROM node:24.22.2-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

# 2) execução: Nginx servindo os arquivos, com volta para o index.html nas rotas do Angular
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/angular-transportadora/browser /usr/share/nginx/html
EXPOSE 80

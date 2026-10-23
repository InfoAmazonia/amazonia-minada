FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS dependencies
WORKDIR /srv/licenses
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
WORKDIR /srv/licenses
ENV NODE_ENV=production TZ=America/Sao_Paulo LANG=C.UTF-8
RUN apk add --no-cache ca-certificates tzdata
COPY --from=dependencies /srv/licenses/node_modules ./node_modules
COPY package.json ./
COPY src ./src
CMD ["node", "src/index.mjs"]

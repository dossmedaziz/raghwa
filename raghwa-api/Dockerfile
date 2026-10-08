# syntax=docker/dockerfile:1

# ── dev: used by docker-compose.yml. Source code is bind-mounted, `nest start --watch` reloads on save.
FROM node:24-alpine AS dev
WORKDIR /app
RUN chown node:node /app
# Same uid as most Linux hosts (1000), so files written into the mounted folder stay yours.
USER node
COPY --chown=node:node package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY --chown=node:node . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ── build: compiles the app and drops dev dependencies.
FROM dev AS build
RUN npm run build && npm prune --omit=dev

# ── runtime: the small production image (docker-compose.prod.yml).
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

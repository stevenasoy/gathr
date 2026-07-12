# Runtime image for the Express API (TypeScript → tsc build → node dist).
# Build with repo root as context:
#   docker build -f apps/api/Dockerfile -t gathr-api .
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci || npm install
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3001/api/health >/dev/null || exit 1
CMD ["node", "dist/index.js"]
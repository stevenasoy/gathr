FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY"
RUN npm run build --workspace=apps/web
FROM nginx:alpine AS runtime
ARG SUPABASE_URL
ARG SUPABASE_WS_URL
COPY apps/web/nginx.conf /tmp/default.conf
RUN test -n "$SUPABASE_URL" && test -n "$SUPABASE_WS_URL" && sed -e "s|__SUPABASE_URL__|$SUPABASE_URL|g" -e "s|__SUPABASE_WS_URL__|$SUPABASE_WS_URL|g" /tmp/default.conf > /etc/nginx/conf.d/default.conf && rm /tmp/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]

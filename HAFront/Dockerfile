FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund
COPY . .

# Las variables PUBLIC_* se incrustan en tiempo de build
ARG PUBLIC_SUPABASE_URL=""
ARG PUBLIC_SUPABASE_ANON_KEY=""
ARG PUBLIC_SITE_URL="http://localhost:4321"
ARG PUBLIC_API_URL="http://localhost:8001"
ARG PUBLIC_AUTH_URL="http://localhost:8000"
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL \
    PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY \
    PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_API_URL=$PUBLIC_API_URL \
    PUBLIC_AUTH_URL=$PUBLIC_AUTH_URL
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
ENV HOST=0.0.0.0 PORT=4321
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]

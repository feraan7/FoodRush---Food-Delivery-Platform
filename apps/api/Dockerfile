FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm install

COPY apps/api ./apps/api
RUN npm run build -w apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install --omit=dev -w apps/api

COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 5000
CMD ["npm", "run", "start", "-w", "apps/api"]

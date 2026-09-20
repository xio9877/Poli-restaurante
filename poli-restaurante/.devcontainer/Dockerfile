# Development stage
FROM node:20-alpine AS dev

WORKDIR /workspace

RUN apk add --no-cache git openssh-client bash

RUN npm install -g @nestjs/cli prisma

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000 9229

CMD ["npm", "run", "start:dev"]

# Production stage
FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN npm run build

FROM node:20-alpine AS prod

WORKDIR /workspace

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /workspace/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /workspace/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /workspace/package.json ./

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
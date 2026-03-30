# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.12.0
FROM node:${NODE_VERSION}-alpine AS builder

# Set production environment by default
ENV NODE_ENV=production
WORKDIR /usr/src/app

# 1️⃣ Copy package files first for caching
COPY package.json package-lock.json ./

# 2️⃣ Copy prisma and nuxt config (needed for postinstall)
COPY prisma ./prisma
COPY nuxt.config.ts ./

# 3️⃣ Install dependencies
RUN npm ci --omit=dev

# 4️⃣ Copy the rest of the source code
COPY . .

# 5️⃣ Build the app
RUN npm run build

# 6️⃣ Prepare production image
FROM node:${NODE_VERSION}-alpine AS production

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy only necessary files from builder
COPY --from=builder /usr/src/app/.output ./
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 3000

USER node

# Run the app
CMD ["node", ".output/server/index.mjs"]

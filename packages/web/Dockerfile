FROM node:18-alpine AS builder

WORKDIR /app

# Copiar los archivos de dependencias
COPY package*.json ./
COPY next.config.js ./
COPY tsconfig*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY public ./public
COPY src ./src

# Variables de entorno para la compilación
ENV NEXT_PUBLIC_API_URL=http://api:3001
ENV NEXTAUTH_URL=http://localhost:3000

# Compilar la aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine

WORKDIR /app

# Copiar dependencias y archivos compilados
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_API_URL=http://api:3001

# Exponer puerto
EXPOSE 3000

# Iniciar la aplicación
CMD ["npm", "start"]

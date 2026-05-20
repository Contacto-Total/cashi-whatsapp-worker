FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

# Directorio de autenticación (montado como volumen en producción)
VOLUME ["/app/wa-auth-keys"]

ENV NODE_ENV=production
ENV WA_AUTH_FILE=/app/wa-auth-keys/creds.json

CMD ["node", "dist/index.js"]

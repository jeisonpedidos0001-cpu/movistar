# Usamos una imagen de Node con soporte para navegadores
FROM ghcr.io/puppeteer/puppeteer:latest

# Cambiamos al usuario root para instalar dependencias y mover archivos
USER root

# Directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código del proyecto
COPY . .

# Compilamos el frontend de React
RUN npm run build

# Exponemos el puerto que Railway nos asigne
EXPOSE 4000

# Comando para arrancar el servidor inteligente
CMD ["node", "backend-tokenApim/server.js"]

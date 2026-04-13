# Optional top-level Dockerfile for building the electron app or packaging; server has its own Dockerfile. 
FROM node:18-bullseye
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node","server.js"]

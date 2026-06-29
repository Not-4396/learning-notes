FROM node:23-alpine

WORKDIR /app

COPY package.json ./
COPY server/index.js server/.
COPY server/.env server/.env

RUN npm install

VOLUME /app/server/data

EXPOSE 3001

CMD ["node", "server/index.js"]

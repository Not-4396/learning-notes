FROM node:23-alpine

WORKDIR /app

# Copy only what the server needs
COPY server/index.js server/index.js
COPY server/package.json server/package.json

WORKDIR /app/server
RUN npm install

# Data directory for SQLite
RUN mkdir -p /app/server/data
VOLUME /app/server/data

EXPOSE 3001

CMD ["node", "index.js"]

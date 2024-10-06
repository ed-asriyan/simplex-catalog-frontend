FROM node:18

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY tsconfig.json .
COPY index.ts .
COPY settings.ts .
COPY api.ts .
COPY database.ts .
COPY geoip.ts .
COPY uri-parser.ts .

CMD npm start

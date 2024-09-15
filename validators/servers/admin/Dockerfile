FROM node:18

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY tsconfig.json .
COPY settings.ts .
COPY index.ts .

CMD npm start

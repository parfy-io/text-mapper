FROM node:11-alpine as build

WORKDIR /build
ADD src /build/src
ADD package.json /build
ADD webpack.config.js /build
ADD tsconfig.json /build

RUN npm i && npm run build

FROM node:11-alpine

WORKDIR /app
COPY --from=build /build/dist/main.js /app/main.js

ENTRYPOINT ["node", "/app/main.js"]
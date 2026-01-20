FROM node:lts-alpine@sha256:c921b97d4b74f51744057454b306b418cf693865e73b8100559189605f6955b8
COPY ./package.json ./
RUN yarn install
COPY . .
EXPOSE 6161
ENTRYPOINT ["node", "./src"]

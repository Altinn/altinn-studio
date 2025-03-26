FROM node:lts-alpine@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944
COPY ./package.json ./
RUN yarn install
COPY . .
EXPOSE 6161
ENTRYPOINT ["node", "./src"]

FROM node:lts-alpine@sha256:8be1dd87743236c7d064aac3733befca88ba9bc6f65c7f6bbd93199f27c33287
COPY ./package.json ./
RUN yarn install
COPY . .
EXPOSE 6161
ENTRYPOINT ["node", "./src"]

FROM node:20-alpine3.18
COPY . .
RUN yarn install
EXPOSE 6161
ENTRYPOINT ["node", "./src"]

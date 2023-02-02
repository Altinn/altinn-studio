FROM node:alpine
COPY . .
RUN yarn install
EXPOSE 6161
ENTRYPOINT ["node", "./src"]

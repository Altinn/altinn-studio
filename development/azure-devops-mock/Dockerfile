FROM node:lts-alpine@sha256:ad1aedbcc1b0575074a91ac146d6956476c1f9985994810e4ee02efd932a68fd
COPY ./package.json ./
RUN yarn install
COPY . .
EXPOSE 6161
ENTRYPOINT ["node", "./src"]

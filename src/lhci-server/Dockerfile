FROM node:18-bullseye-slim@sha256:d69fb189fa7765636655db043a6a9e6be5ddf94bd1a8dc33fd0bcf4664606a9e

RUN apt-get update --fix-missing && \
    apt-get install -y python3 build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /usr/src/lhci

COPY package.json yarn.lock ./
COPY .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

RUN yarn --immutable

COPY server.js ./

EXPOSE 9001

RUN groupadd -r lhci && useradd -r -g lhci lhci && \
    mkdir -p /home/lhci/.cache && \
    chown -R lhci:lhci /usr/src/lhci /home/lhci
USER lhci

CMD ["yarn", "start"]

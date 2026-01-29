FROM node:18-bullseye-slim

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

COPY lighthouserc.json ./

COPY server.js ./

EXPOSE 9001

RUN groupadd -r lhci && useradd -r -g lhci lhci && \
    mkdir -p /home/lhci/.cache && \
    chown -R lhci:lhci /usr/src/lhci /home/lhci
USER lhci

CMD ["yarn", "start"]

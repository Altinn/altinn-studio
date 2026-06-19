FROM node:24-bullseye-slim@sha256:97f4db7fcde59ccb550cf2815238b846744d447456995f61a800e7e961925e3e

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

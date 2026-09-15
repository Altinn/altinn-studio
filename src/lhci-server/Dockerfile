FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e

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

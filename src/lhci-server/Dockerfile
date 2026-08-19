FROM node:24-bullseye-slim@sha256:7af27dbbe7d3e4512b83a49b8831463d5cbfdd2dce22675af73558f5ad66e8ef

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

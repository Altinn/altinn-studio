# base image
FROM node:16.13.2-alpine3.15

# set working directory
WORKDIR /usr/src/app

# install and cache app dependencies
COPY package.json .
COPY yarn.lock .
COPY .yarn/ ./.yarn/
COPY .yarnrc.yml .


RUN corepack enable
RUN yarn --immutable

# start app
CMD ["yarn", "start"]

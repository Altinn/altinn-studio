# base image
FROM node:16.13.1-alpine3.14

# set working directory
RUN mkdir /usr/src/app
WORKDIR /usr/src/app

# install and cache app dependencies
COPY package.json /usr/src/app/package.json
COPY yarn.lock /usr/src/app/yarn.lock
RUN yarn --immutable

# start app
CMD ["yarn", "start"]

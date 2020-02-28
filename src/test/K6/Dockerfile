FROM mhart/alpine-node:latest AS build
RUN npm install k6-to-junit
FROM loadimpact/k6 AS tests
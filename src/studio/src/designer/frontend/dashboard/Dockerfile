# base image
FROM node:16.13.0-alpine3.14 AS generate-dashboard

COPY ./src/designer/frontend/package.json .
COPY ./src/designer/frontend/yarn.lock .
RUN yarn --immutable

# Copy and install dependencies
COPY ./src/designer/frontend/shared/package.json ./shared/
COPY ./src/designer/frontend/dashboard/package.json ./dashboard/

RUN yarn run install-deps

# Copy and build Shared + Dashboard
WORKDIR /
COPY ./src/designer/frontend/shared/ ./shared/
COPY ./src/designer/frontend/dashboard/ ./dashboard/
RUN yarn workspace dashboard run build

# Create Dashboard base image
FROM alpine
WORKDIR /dist
COPY --from=generate-dashboard ./dist/dashboard/dashboard.js .
COPY --from=generate-dashboard ./dist/dashboard/dashboard.css .

CMD ["echo", "done"]

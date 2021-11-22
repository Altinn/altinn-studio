# base image
FROM node:14.18.1-alpine3.14 AS generate-dashboard

COPY ./src/designer/frontend/package.json .
COPY ./src/designer/frontend/yarn.lock .

# Copy and install dependencies
COPY ./src/designer/frontend/shared/package.json ./shared/
COPY ./src/designer/frontend/dashboard/package.json ./dashboard/

RUN yarn --immutable

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

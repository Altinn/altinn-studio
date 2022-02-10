# base image
FROM node:16.13.2-alpine3.15 AS generate-dashboard

WORKDIR /build

COPY ./src/designer/frontend/package.json .
COPY ./src/designer/frontend/yarn.lock .
COPY ./src/designer/frontend/.yarn/ ./.yarn/
COPY ./src/designer/frontend/.yarnrc.yml .

# Copy and install dependencies
COPY ./src/designer/frontend/shared/package.json ./shared/
COPY ./src/designer/frontend/dashboard/package.json ./dashboard/

RUN corepack enable
RUN yarn --immutable

# Copy and build Shared + Dashboard
COPY ./src/designer/frontend/shared/ ./shared/
COPY ./src/designer/frontend/dashboard/ ./dashboard/
RUN yarn workspace dashboard run build

# Create Dashboard base image
FROM alpine
WORKDIR /dist
COPY --from=generate-dashboard /build/dist/dashboard/dashboard.js .
COPY --from=generate-dashboard /build/dist/dashboard/dashboard.css .

CMD ["echo", "done"]

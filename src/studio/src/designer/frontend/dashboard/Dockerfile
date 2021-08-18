# base image
FROM node:14.17.4-alpine3.14 AS generate-dashboard

# Copy and install Lerna
COPY ./src/designer/frontend/lerna.json .
COPY ./src/designer/frontend/package.json .
COPY ./src/designer/frontend/package-lock.json .
RUN npm ci

# Copy and install npm dependencies
COPY ./src/designer/frontend/shared/package.json ./shared/
COPY ./src/designer/frontend/shared/package-lock.json ./shared/
COPY ./src/designer/frontend/dashboard/package.json ./dashboard/
COPY ./src/designer/frontend/dashboard/package-lock.json ./dashboard/

RUN npm run install-deps

# Copy and build Shared + Dashboard
WORKDIR /
COPY ./src/designer/frontend/shared/ ./shared/
COPY ./src/designer/frontend/dashboard/ ./dashboard/
RUN npm run build --prefix ./dashboard

# Create Dashboard base image
FROM alpine
WORKDIR /dist
COPY --from=generate-dashboard ./dist/dashboard/dashboard.js .
COPY --from=generate-dashboard ./dist/dashboard/dashboard.css .

CMD ["echo", "done"]

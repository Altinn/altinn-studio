# base image
FROM node:10.13.0 AS generate-dashboard

# Copy and install Lerna
COPY ./designer/frontend/lerna.json .
COPY ./designer/frontend/package.json .
COPY ./designer/frontend/package-lock.json .
RUN npm ci

# Copy and install npm dependencies
COPY ./designer/frontend/shared/package.json ./shared/
COPY ./designer/frontend/shared/package-lock.json ./shared/
COPY ./designer/frontend/dashboard/package.json ./dashboard/
COPY ./designer/frontend/dashboard/package-lock.json ./dashboard/

RUN npm run install-deps

# Copy and build Shared + Dashboard
WORKDIR /
COPY ./designer/frontend/shared/ ./shared/
COPY ./designer/frontend/dashboard/ ./dashboard/
RUN npm run build --prefix ./dashboard

# Create Dashboard base image
FROM alpine
WORKDIR /dist
COPY --from=generate-dashboard ./dist/dashboard/dashboard.js .
COPY --from=generate-dashboard ./dist/dashboard/dashboard.css .

CMD ["echo", "done"]

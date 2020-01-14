# base image
FROM node:10.13.0 AS generate-dashboard

# Copy and install Lerna
COPY ./Designer/Frontend/lerna.json .
COPY ./Designer/Frontend/package.json .
COPY ./Designer/Frontend/package-lock.json .
RUN npm ci

# Copy and install npm dependencies
COPY ./Designer/Frontend/applications/shared/package.json ./applications/shared/
COPY ./Designer/Frontend/applications/shared/package-lock.json ./applications/shared/
COPY ./Designer/Frontend/applications/dashboard/package.json ./applications/dashboard/
COPY ./Designer/Frontend/applications/dashboard/package-lock.json ./applications/dashboard/

RUN npm run install-deps

# Copy and build Shared + Dashboard
WORKDIR /applications
COPY ./Designer/Frontend/applications/shared/ ./shared/
COPY ./Designer/Frontend/applications/dashboard/ ./dashboard/
WORKDIR /
RUN npm run build --prefix ./applications/dashboard

# Create Dashboard base image
FROM alpine
WORKDIR /dist
COPY --from=generate-dashboard ./applications/dashboard/dist/dashboard.js .
COPY --from=generate-dashboard ./applications/dashboard/dist/dashboard.css .

CMD ["echo", "done"]

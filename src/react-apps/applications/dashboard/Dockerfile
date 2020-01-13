# base image
FROM node:10.13.0 AS generate-dashboard

# Copy and install Lerna
COPY ../react-apps/lerna.json .
COPY ../react-apps/package.json .
COPY ../react-apps/package-lock.json .
RUN npm ci

# Copy and install npm dependencies
COPY ../react-apps/applications/shared/package.json ./applications/shared/
COPY ../react-apps/applications/shared/package-lock.json ./applications/shared/
COPY ../react-apps/applications/dashboard/package.json ./applications/dashboard/
COPY ../react-apps/applications/dashboard/package-lock.json ./applications/dashboard/

RUN npm run install-deps

# Copy and build Shared + Service-Development
WORKDIR /applications
COPY ../react-apps/applications/shared/ ./shared/
COPY ../react-apps/applications/dashboard/ ./dashboard/
WORKDIR /
RUN npm run build --prefix ./applications/dashboard

# Create Dashboard base image
FROM alpine
WORKDIR /dist
COPY --from=generate-dashboard ./applications/dashboard/dist/dashboard.js .
COPY --from=generate-dashboard ./applications/dashboard/dist/dashboard.css .

CMD ["echo", "done"]

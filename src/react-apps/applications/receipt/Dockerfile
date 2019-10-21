# base image
FROM node:10.13.0  AS generate-receipt-app

# Copy and install Lerna
# Context is ./src, see docker-compose.yaml in src\Altinn.Platform\Altinn.Platform.Receipt\docker-compose.yml
COPY react-apps/lerna.json .
COPY react-apps/package.json .
COPY react-apps/package-lock.json .
RUN npm ci

# Copy shared and receipt
COPY react-apps/applications/shared/ /applications/shared/
COPY react-apps/applications/receipt/ /applications/receipt/

# Install
RUN npm run install-deps

# Build runtime
RUN npm run build --prefix /applications/receipt; exit 0

CMD ["echo", "done"]



# base image
FROM node:16.13.0-alpine3.14 AS generate-receipt-app

# Context is ./src, see docker-compose.yaml in src\Altinn.Platform\Altinn.Platform.Receipt\docker-compose.yml
COPY Altinn.Apps/AppFrontend/react/package.json .
COPY Altinn.Apps/AppFrontend/react/yarn.lock .

# Copy shared and receipt
COPY Altinn.Apps/AppFrontend/react/shared/ /shared/
COPY Altinn.Apps/AppFrontend/react/receipt/ /receipt/

# Install
RUN yarn

# Build runtime
RUN npm run build:receipt; exit 0

CMD ["echo", "done"]

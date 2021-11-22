# base image
FROM node:14.18.1-alpine3.14 AS generate-receipt-app

# Context is ./src, see docker-compose.yaml in src\Altinn.Platform\Altinn.Platform.Receipt\docker-compose.yml
COPY Altinn.Apps/AppFrontend/react/package.json .
COPY Altinn.Apps/AppFrontend/react/yarn.lock .

# Copy shared and receipt
COPY Altinn.Apps/AppFrontend/react/shared/ /shared/
COPY Altinn.Apps/AppFrontend/react/receipt/ /receipt/

# Install
RUN yarn

# Build runtime
# TODO: update this command with yarn usage
RUN npm run build --prefix /receipt; exit 0

CMD ["echo", "done"]

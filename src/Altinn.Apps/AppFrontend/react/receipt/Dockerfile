# base image
FROM node:16.15.1-alpine3.16 AS generate-receipt-app

WORKDIR /build

# Context is ./src, see docker-compose.yaml in src\Altinn.Platform\Altinn.Platform.Receipt\docker-compose.yml
COPY Altinn.Apps/AppFrontend/react/package.json .
COPY Altinn.Apps/AppFrontend/react/yarn.lock .
COPY Altinn.Apps/AppFrontend/react/.yarn/ ./.yarn/
COPY Altinn.Apps/AppFrontend/react/.yarnrc.yml .

# Copy shared and receipt code.
COPY Altinn.Apps/AppFrontend/react/shared/ ./shared/
COPY Altinn.Apps/AppFrontend/react/receipt/ ./receipt/

# Install
RUN corepack enable
RUN yarn --immutable

# Build runtime
RUN yarn workspace receipt-react-app run build; exit 0

CMD ["echo", "done"]

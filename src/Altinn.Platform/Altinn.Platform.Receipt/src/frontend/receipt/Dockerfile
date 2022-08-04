# base image
FROM node:16.16.0-alpine3.16 AS generate-receipt-app

WORKDIR /build

# Context is ./src, see docker-compose.yaml in src\Altinn.Platform\Altinn.Platform.Receipt\docker-compose.yml
COPY src/frontend/package.json .
COPY src/frontend/yarn.lock .
COPY src/frontend/.yarn/ ./.yarn/
COPY src/frontend/.yarnrc.yml .

# Copy shared and receipt code.
COPY src/frontend/shared/ ./shared/
COPY src/frontend/receipt/ ./receipt/

# Install
RUN corepack enable
RUN yarn --immutable

# Build runtime
RUN yarn workspace receipt-react-app run build; exit 0

CMD ["echo", "done"]

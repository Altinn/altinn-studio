# base image
FROM node:16.13.0-alpine3.14 AS generate-app-development

COPY ./src/designer/frontend/package.json .
COPY ./src/designer/frontend/yarn.lock .
RUN yarn --immutable

# Copy and install dependencies
COPY ./src/designer/frontend/shared/package.json /shared/
COPY ./src/designer/frontend/app-development/package.json /app-development/
COPY ./src/designer/frontend/ux-editor/package.json /ux-editor/

RUN yarn run install-deps

# Copy and build shared + app-development + ux-editor
WORKDIR /
COPY ./src/designer/frontend/shared/ ./shared/
COPY ./src/designer/frontend/app-development/ ./app-development/
COPY ./src/designer/frontend/ux-editor ./ux-editor/
WORKDIR /
RUN yarn workspace app-development run build

# Create Service-Development base image
FROM alpine
WORKDIR /dist/
COPY --from=generate-app-development /dist/app-development/app-development.js .
COPY --from=generate-app-development /dist/app-development/0.app-development.js .
COPY --from=generate-app-development /dist/app-development/1.app-development.js .
COPY --from=generate-app-development /dist/app-development/2.app-development.js .
COPY --from=generate-app-development /dist/app-development/3.app-development.js .
COPY --from=generate-app-development /dist/app-development/js/react/editor.worker.js .
COPY --from=generate-app-development /dist/app-development/js/react/typescript.worker.js .
COPY --from=generate-app-development /dist/app-development/app-development.css .

CMD ["echo", "done"]

# base image
FROM node:14.17.3-alpine3.13 AS generate-app-development

# Copy and install Lerna
COPY ./src/designer/frontend/lerna.json .
COPY ./src/designer/frontend/package.json .
COPY ./src/designer/frontend/package-lock.json .
RUN npm ci

# Copy and install npm dependencies
COPY ./src/designer/frontend/shared/package.json /shared/
COPY ./src/designer/frontend/shared/package-lock.json /shared/
COPY ./src/designer/frontend/app-development/package.json /app-development/
COPY ./src/designer/frontend/app-development/package-lock.json /app-development/
COPY ./src/designer/frontend/ux-editor/package.json /ux-editor/
COPY ./src/designer/frontend/ux-editor/package-lock.json /ux-editor/

RUN npm run install-deps

# Copy and build shared + app-development + ux-editor
WORKDIR /
COPY ./src/designer/frontend/shared/ ./shared/
COPY ./src/designer/frontend/app-development/ ./app-development/
COPY ./src/designer/frontend/ux-editor ./ux-editor/
WORKDIR /
RUN npm run build --prefix /app-development

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

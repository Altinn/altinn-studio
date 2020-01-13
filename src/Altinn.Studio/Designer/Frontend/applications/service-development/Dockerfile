# base image
FROM node:10.13.0 AS generate-service-development

# Copy and install Lerna
COPY ./src/react-apps/lerna.json .
COPY ./src/react-apps/package.json .
COPY ./src/react-apps/package-lock.json .
RUN npm ci

# Copy and install npm dependencies
COPY ./src/react-apps/applications/shared/package.json /applications/shared/
COPY ./src/react-apps/applications/shared/package-lock.json /applications/shared/
COPY ./src/react-apps/applications/service-development/package.json /applications/service-development/
COPY ./src/react-apps/applications/service-development/package-lock.json /applications/service-development/
COPY ./src/react-apps/applications/ux-editor/package.json /applications/ux-editor/
COPY ./src/react-apps/applications/ux-editor/package-lock.json /applications/ux-editor/

RUN npm run install-deps

# Copy and build Shared + Service-Development, + ux-editor standalone
WORKDIR /applications
COPY ./src/react-apps/applications/shared/ ./shared/
COPY ./src/react-apps/applications/service-development/ ./service-development/
COPY ./src/react-apps/applications/ux-editor/ ./ux-editor/
WORKDIR /
RUN npm run build --prefix /applications/service-development

# Create Service-Development base image
FROM alpine
WORKDIR /dist
COPY --from=generate-service-development /applications/service-development/dist/service-development.js .
COPY --from=generate-service-development /applications/service-development/dist/0.service-development.js .
COPY --from=generate-service-development /applications/service-development/dist/1.service-development.js .
COPY --from=generate-service-development /applications/service-development/dist/2.service-development.js .
COPY --from=generate-service-development /applications/service-development/dist/3.service-development.js .
COPY --from=generate-service-development /applications/service-development/js/react/editor.worker.js .
COPY --from=generate-service-development /applications/service-development/js/react/typescript.worker.js .
COPY --from=generate-service-development /applications/service-development/dist/service-development.css .

CMD ["echo", "done"]

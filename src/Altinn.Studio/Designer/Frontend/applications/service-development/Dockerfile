# base image
FROM node:10.13.0 AS generate-service-development

# Copy and install Lerna
COPY ./Designer/Frontend/lerna.json .
COPY ./Designer/Frontend/package.json .
COPY ./Designer/Frontend/package-lock.json .
RUN npm ci

# Copy and install npm dependencies
COPY ./Designer/Frontend/applications/shared/package.json /applications/shared/
COPY ./Designer/Frontend/applications/shared/package-lock.json /applications/shared/
COPY ./Designer/Frontend/applications/service-development/package.json /applications/service-development/
COPY ./Designer/Frontend/applications/service-development/package-lock.json /applications/service-development/
COPY ./Designer/Frontend/applications/ux-editor/package.json /applications/ux-editor/
COPY ./Designer/Frontend/applications/ux-editor/package-lock.json /applications/ux-editor/

RUN npm run install-deps

# Copy and build Shared + Service-Development, + ux-editor standalone
WORKDIR /applications
COPY ./Designer/Frontend/applications/shared/ ./shared/
COPY ./Designer/Frontend/applications/service-development/ ./service-development/
COPY ./Designer/Frontend/applications/ux-editor/ ./ux-editor/
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

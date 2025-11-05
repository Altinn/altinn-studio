# Building studio frontend
FROM node:lts-alpine@sha256:f36fed0b2129a8492535e2853c64fbdbd2d29dc1219ee3217023ca48aebd3787 AS generate-studio-frontend
WORKDIR /build

COPY ./package.json yarn.lock ./
COPY ./.yarnrc.yml ./.yarnrc.yml
COPY ./.yarn/releases ./.yarn/releases

COPY src/Designer/development/azure-devops-mock/package.json ./src/Designer/development/azure-devops-mock/
COPY src/Designer/frontend/package.json ./src/Designer/frontend/
COPY src/Designer/frontend/app-development/package.json ./src/Designer/frontend/app-development/
COPY src/Designer/frontend/app-preview/package.json ./src/Designer/frontend/app-preview/
COPY src/Designer/frontend/dashboard/package.json ./src/Designer/frontend/dashboard/
COPY src/Designer/frontend/admin/package.json ./src/Designer/frontend/admin/
COPY src/Designer/frontend/language/package.json ./src/Designer/frontend/language/
COPY src/Designer/frontend/libs/studio-assistant/package.json ./src/Designer/frontend/libs/studio-assistant/
COPY src/Designer/frontend/libs/studio-browser-storage/package.json ./src/Designer/frontend/libs/studio-browser-storage/
COPY src/Designer/frontend/libs/studio-components/package.json ./src/Designer/frontend/libs/studio-components/
COPY src/Designer/frontend/libs/studio-components-legacy/package.json ./src/Designer/frontend/libs/studio-components-legacy/
COPY src/Designer/frontend/libs/studio-content-library/package.json ./src/Designer/frontend/libs/studio-content-library/
COPY src/Designer/frontend/libs/studio-feature-flags/package.json ./src/Designer/frontend/libs/studio-feature-flags/
COPY src/Designer/frontend/libs/studio-feedback-form/package.json ./src/Designer/frontend/libs/studio-feedback-form/
COPY src/Designer/frontend/libs/studio-hooks/package.json ./src/Designer/frontend/libs/studio-hooks/
COPY src/Designer/frontend/libs/studio-icons/package.json ./src/Designer/frontend/libs/studio-icons/
COPY src/Designer/frontend/libs/studio-pure-functions/package.json ./src/Designer/frontend/libs/studio-pure-functions/
COPY src/Designer/frontend/packages/policy-editor/package.json ./src/Designer/frontend/packages/policy-editor/
COPY src/Designer/frontend/packages/process-editor/package.json ./src/Designer/frontend/packages/process-editor/
COPY src/Designer/frontend/packages/schema-editor/package.json ./src/Designer/frontend/packages/schema-editor/
COPY src/Designer/frontend/packages/schema-model/package.json ./src/Designer/frontend/packages/schema-model/
COPY src/Designer/frontend/packages/shared/package.json ./src/Designer/frontend/packages/shared/
COPY src/Designer/frontend/packages/text-editor/package.json ./src/Designer/frontend/packages/text-editor/
COPY src/Designer/frontend/packages/ux-editor/package.json ./src/Designer/frontend/packages/ux-editor/
COPY src/Designer/frontend/packages/ux-editor-v3/package.json ./src/Designer/frontend/packages/ux-editor-v3/
COPY src/Designer/frontend/resourceadm/package.json ./src/Designer/frontend/resourceadm/
COPY src/Designer/frontend/resourceadm/testing/playwright/package.json ./src/Designer/frontend/resourceadm/testing/playwright/
COPY src/Designer/frontend/studio-root/package.json ./src/Designer/frontend/studio-root/
COPY src/Designer/frontend/testing/cypress/package.json ./src/Designer/frontend/testing/cypress/
COPY src/Designer/frontend/testing/playwright/package.json ./src/Designer/frontend/testing/playwright/

RUN yarn --immutable

COPY . .
RUN cd src/Designer/frontend && yarn build

# Building the backend
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:f271ed7d0fd9c5a7ed0acafed8a2bc978bb65c19dcd2eeea0415adef142ffc87 AS generate-studio-backend
ARG DESIGNER_VERSION=''
WORKDIR /build
COPY src/Designer/backend .
RUN dotnet publish src/Designer/Designer.csproj -c Release -o /app_output
RUN rm -f /app_output/Altinn.Studio.Designer.staticwebassets.runtime.json
# Create version file
WORKDIR /version
RUN echo "{\"version\": \"${DESIGNER_VERSION}\"}" > version.json

# Prepare app template
FROM alpine@sha256:4b7ce07002c69e8f3d704a9c5d6fd3053be500b7f1c69fc0d80990c2ad8dd412 AS app-template-release
RUN apk add --no-cache rsync

COPY ./src/App/template/src /app-template-dotnet-src
WORKDIR /app-template-dotnet-src
RUN rsync . -rv --exclude-from=.releaseignore --exclude-from=.gitignore /app-template-release

# Building the final image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:5e8dca92553951e42caed00f2568771b0620679f419a28b1335da366477d7f98 AS final
EXPOSE 80
WORKDIR /app
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
  DOTNET_RUNNING_IN_CONTAINER=true
RUN apk add --no-cache icu-libs krb5-libs libgcc libintl openssl libstdc++ zlib curl

COPY --from=generate-studio-backend /app_output .

COPY --from=generate-studio-frontend /build/src/Designer/frontend/app-development/dist ./wwwroot/editor/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/admin/dist ./wwwroot/admin/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/dashboard/dist ./wwwroot/dashboard/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/studio-root/dist ./wwwroot/info/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/app-preview/dist ./wwwroot/preview/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/resourceadm/dist ./wwwroot/resourceadm/

COPY --from=generate-studio-backend /version/version.json ./wwwroot/designer/version.json

## Copying app template
COPY --from=app-template-release /app-template-release ./Templates/AspNet

ENTRYPOINT ["dotnet", "Altinn.Studio.Designer.dll"]

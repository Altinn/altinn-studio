# Building studio frontend
FROM node:lts-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS generate-studio-frontend
WORKDIR /build

COPY ./package.json yarn.lock ./
COPY ./.yarnrc.yml ./.yarnrc.yml
COPY ./.yarn/releases ./.yarn/releases
COPY ./.yarn/patches ./.yarn/patches

COPY src/App/frontend/package.json ./src/App/frontend/

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
COPY src/Designer/frontend/libs/studio-content-library/package.json ./src/Designer/frontend/libs/studio-content-library/
COPY src/Designer/frontend/libs/studio-feature-flags/package.json ./src/Designer/frontend/libs/studio-feature-flags/
COPY src/Designer/frontend/libs/studio-feedback-form/package.json ./src/Designer/frontend/libs/studio-feedback-form/
COPY src/Designer/frontend/libs/studio-guard/package.json ./src/Designer/frontend/libs/studio-guard/
COPY src/Designer/frontend/libs/studio-hooks/package.json ./src/Designer/frontend/libs/studio-hooks/
COPY src/Designer/frontend/libs/studio-icons/package.json ./src/Designer/frontend/libs/studio-icons/
COPY src/Designer/frontend/libs/studio-pure-functions/package.json ./src/Designer/frontend/libs/studio-pure-functions/
COPY src/Designer/frontend/libs/studio-ui-test/package.json ./src/Designer/frontend/libs/studio-ui-test/
COPY src/Designer/frontend/packages/policy-editor/package.json ./src/Designer/frontend/packages/policy-editor/
COPY src/Designer/frontend/packages/process-editor/package.json ./src/Designer/frontend/packages/process-editor/
COPY src/Designer/frontend/packages/schema-editor/package.json ./src/Designer/frontend/packages/schema-editor/
COPY src/Designer/frontend/packages/schema-model/package.json ./src/Designer/frontend/packages/schema-model/
COPY src/Designer/frontend/packages/shared/package.json ./src/Designer/frontend/packages/shared/
COPY src/Designer/frontend/packages/text-editor/package.json ./src/Designer/frontend/packages/text-editor/
COPY src/Designer/frontend/packages/ux-editor-v4/package.json ./src/Designer/frontend/packages/ux-editor-v4/
COPY src/Designer/frontend/packages/ux-editor-v3/package.json ./src/Designer/frontend/packages/ux-editor-v3/
COPY src/Designer/frontend/resourceadm/package.json ./src/Designer/frontend/resourceadm/
COPY src/Designer/frontend/resourceadm/testing/playwright/package.json ./src/Designer/frontend/resourceadm/testing/playwright/
COPY src/Designer/frontend/studio-root/package.json ./src/Designer/frontend/studio-root/
COPY src/Designer/frontend/testing/cypress/package.json ./src/Designer/frontend/testing/cypress/
COPY src/Designer/frontend/testing/playwright/package.json ./src/Designer/frontend/testing/playwright/
COPY src/Designer/frontend/settings/package.json ./src/Designer/frontend/settings/
COPY src/common/ts/package.json ./src/common/ts/
COPY src/common/ts/form-component/package.json ./src/common/ts/form-component/
COPY src/common/ts/form-engine/package.json ./src/common/ts/form-engine/
COPY src/common/ts/language/package.json ./src/common/ts/language/

ARG CYPRESS_INSTALL_BINARY=0
ARG PUPPETEER_SKIP_DOWNLOAD=true
ENV CYPRESS_INSTALL_BINARY=${CYPRESS_INSTALL_BINARY}
ENV PUPPETEER_SKIP_DOWNLOAD=${PUPPETEER_SKIP_DOWNLOAD}

RUN yarn --immutable

COPY . .
RUN cd src/Designer/frontend && yarn build
# Build the Altinn app frontend so Designer can serve it locally for v9 app previews (no CDN dependency)
RUN cd src/App/frontend && yarn build

# Building the backend
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine@sha256:d8ee39817ca03a3757288e83c37ed73cc969a286c603b827c7cbe33add1c2d1c AS generate-studio-backend
ARG DESIGNER_VERSION=''
WORKDIR /build
COPY src/common/dotnet/Altinn.Studio.Common ./src/common/dotnet/Altinn.Studio.Common
COPY src/Designer/backend ./src/Designer/backend
RUN dotnet publish src/Designer/backend/src/Designer/Designer.csproj -c Release -o /app_output /p:CSharpier_Bypass=true
RUN rm -f /app_output/Altinn.Studio.Designer.staticwebassets.runtime.json
# Create version file
WORKDIR /version
RUN echo "{\"version\": \"${DESIGNER_VERSION}\"}" > version.json

# Prepare app templates, one release tree per selectable template.
# The "<id>/src" shape mirrors src/App/template exactly, so a locally run Designer can point straight
# at the repository folder without a second path convention. rsync will not create intermediate
# directories, hence the mkdir.
FROM alpine@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b AS app-template-release
RUN apk add --no-cache rsync
RUN mkdir -p /app-template-release/v8 /app-template-release/v9

COPY ./src/App/template/v8/src /app-template-dotnet-src/v8
WORKDIR /app-template-dotnet-src/v8
RUN rsync . -rv --exclude-from=.releaseignore --exclude-from=.gitignore /app-template-release/v8/src

COPY ./src/App/template/v9/src /app-template-dotnet-src/v9
WORKDIR /app-template-dotnet-src/v9
RUN rsync . -rv --exclude-from=.releaseignore --exclude-from=.gitignore /app-template-release/v9/src

# Building the final image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine@sha256:27b6b84beeede74fd16886177d360799c8e4299ceadfbd64eef57bafead7878a AS final
EXPOSE 80
WORKDIR /app
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
  DOTNET_RUNNING_IN_CONTAINER=true
RUN apk add --no-cache icu-libs krb5-libs libgcc libintl openssl libstdc++ zlib curl tzdata

COPY --from=generate-studio-backend /app_output .

COPY --from=generate-studio-frontend /build/src/Designer/frontend/app-development/dist ./wwwroot/editor/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/admin/dist ./wwwroot/admin/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/dashboard/dist ./wwwroot/dashboard/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/studio-root/dist ./wwwroot/info/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/app-preview/dist ./wwwroot/preview/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/resourceadm/dist ./wwwroot/resourceadm/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/settings/dist ./wwwroot/settings/

# Altinn app frontend bundle, served by Designer for v9 app previews at /altinn-app-frontend/
COPY --from=generate-studio-frontend /build/src/App/frontend/dist ./wwwroot/altinn-app-frontend/

COPY --from=generate-studio-backend /version/version.json ./wwwroot/designer/version.json

## Copying app templates. GeneralSettings decides which one new applications default to.
COPY --from=app-template-release /app-template-release ./Templates/AspNet

ENTRYPOINT ["dotnet", "Altinn.Studio.Designer.dll"]

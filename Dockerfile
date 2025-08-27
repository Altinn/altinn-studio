# Building studio frontend
FROM node:lts-alpine@sha256:5539840ce9d013fa13e3b9814c9353024be7ac75aca5db6d039504a56c04ea59 AS generate-studio-frontend
WORKDIR /build

COPY ./package.json yarn.lock ./
COPY ./.yarnrc.yml ./.yarnrc.yml
COPY ./.yarn/releases ./.yarn/releases

COPY ./development/azure-devops-mock/package.json ./development/azure-devops-mock/
COPY src/Designer/frontend/app-development/package.json ./frontend/app-development/
COPY src/Designer/frontend/app-preview/package.json ./frontend/app-preview/
COPY src/Designer/frontend/dashboard/package.json ./frontend/dashboard/
COPY src/Designer/frontend/admin/package.json ./frontend/admin/
COPY src/Designer/frontend/language/package.json ./frontend/language/
COPY src/Designer/frontend/libs/studio-components/package.json ./frontend/libs/studio-components/
COPY src/Designer/frontend/libs/studio-components-legacy/package.json ./frontend/libs/studio-components-legacy/
COPY src/Designer/frontend/libs/studio-content-library/package.json ./frontend/libs/studio-content-library/
COPY src/Designer/frontend/libs/studio-feedback-form/package.json ./frontend/libs/studio-feedback-form/
COPY src/Designer/frontend/libs/studio-hooks/package.json ./frontend/libs/studio-hooks/
COPY src/Designer/frontend/libs/studio-icons/package.json ./frontend/libs/studio-icons/
COPY src/Designer/frontend/libs/studio-pure-functions/package.json ./frontend/libs/studio-pure-functions/
COPY src/Designer/frontend/packages/policy-editor/package.json ./frontend/packages/policy-editor/
COPY src/Designer/frontend/packages/process-editor/package.json ./frontend/packages/process-editor/
COPY src/Designer/frontend/packages/schema-editor/package.json ./frontend/packages/schema-editor/
COPY src/Designer/frontend/packages/schema-model/package.json ./frontend/packages/schema-model/
COPY src/Designer/frontend/packages/shared/package.json ./frontend/packages/shared/
COPY src/Designer/frontend/packages/text-editor/package.json ./frontend/packages/text-editor/
COPY src/Designer/frontend/packages/ux-editor/package.json ./frontend/packages/ux-editor/
COPY src/Designer/frontend/packages/ux-editor-v3/package.json ./frontend/packages/ux-editor-v3/
COPY src/Designer/frontend/resourceadm/package.json ./frontend/resourceadm/
COPY src/Designer/frontend/resourceadm/testing/playwright/package.json ./frontend/resourceadm/testing/playwright/
COPY src/Designer/frontend/studio-root/package.json ./frontend/studio-root/
COPY src/Designer/frontend/testing/cypress/package.json ./frontend/testing/cypress/
COPY src/Designer/frontend/testing/playwright/package.json ./frontend/testing/playwright/

RUN yarn --immutable

COPY . .
RUN yarn build

# Building the backend
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:430bd56f4348f9dd400331f0d71403554ec83ae1700a7dcfe1e1519c9fd12174 AS generate-studio-backend
ARG DESIGNER_VERSION=''
WORKDIR /build
COPY src/Designer/backend .
RUN dotnet publish src/Designer/Designer.csproj -c Release -o /app_output
RUN rm -f /app_output/Altinn.Studio.Designer.staticwebassets.runtime.json
# Create version file
WORKDIR /version
RUN echo "{\"version\": \"${DESIGNER_VERSION}\"}" > version.json

# Prepare app template
FROM alpine@sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1 AS app-template-release
RUN apk add --no-cache rsync

COPY ./src/App/app-template-dotnet/src /app-template-dotnet-src
WORKDIR /app-template-dotnet-src
RUN rsync . -rv --exclude-from=.releaseignore --exclude-from=.gitignore /app-template-release

# Building the final image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:d4bf3d8c8f0236341ddd93d15208152e26bc6dcc9d34c635351a3402c284137f AS final
EXPOSE 80
WORKDIR /app
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
  DOTNET_RUNNING_IN_CONTAINER=true
RUN apk add --no-cache icu-libs krb5-libs libgcc libintl openssl libstdc++ zlib curl

COPY --from=generate-studio-backend /app_output .

COPY --from=generate-studio-frontend /build/frontend/app-development/dist ./wwwroot/editor/
COPY --from=generate-studio-frontend /build/frontend/dashboard/dist ./wwwroot/dashboard/
COPY --from=generate-studio-frontend /build/frontend/studio-root/dist ./wwwroot/info/
COPY --from=generate-studio-frontend /build/frontend/app-preview/dist ./wwwroot/preview/
COPY --from=generate-studio-frontend /build/frontend/resourceadm/dist ./wwwroot/resourceadm/

COPY --from=generate-studio-backend /version/version.json ./wwwroot/designer/version.json

## Copying app template
COPY --from=app-template-release /app-template-release ./Templates/AspNet


ENTRYPOINT ["dotnet", "Altinn.Studio.Designer.dll"]

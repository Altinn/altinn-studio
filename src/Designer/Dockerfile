# Building studio frontend
FROM node:lts-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS generate-studio-frontend
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
COPY src/Designer/frontend/packages/process-editor-v8/package.json ./src/Designer/frontend/packages/process-editor-v8/
COPY src/Designer/frontend/packages/schema-editor/package.json ./src/Designer/frontend/packages/schema-editor/
COPY src/Designer/frontend/packages/schema-model/package.json ./src/Designer/frontend/packages/schema-model/
COPY src/Designer/frontend/packages/shared/package.json ./src/Designer/frontend/packages/shared/
COPY src/Designer/frontend/packages/text-editor/package.json ./src/Designer/frontend/packages/text-editor/
COPY src/Designer/frontend/packages/ux-editor-v4/package.json ./src/Designer/frontend/packages/ux-editor-v4/
COPY src/Designer/frontend/packages/ux-editor-v3/package.json ./src/Designer/frontend/packages/ux-editor-v3/
COPY src/Designer/frontend/resourceadm/package.json ./src/Designer/frontend/resourceadm/
COPY src/Designer/frontend/resourceadm/testing/playwright/package.json ./src/Designer/frontend/resourceadm/testing/playwright/
COPY src/Designer/frontend/studio-root/package.json ./src/Designer/frontend/studio-root/
COPY src/Designer/frontend/testing/playwright/package.json ./src/Designer/frontend/testing/playwright/
COPY src/Designer/frontend/settings/package.json ./src/Designer/frontend/settings/
COPY src/common/ts/package.json ./src/common/ts/
COPY src/common/ts/form-component/package.json ./src/common/ts/form-component/
COPY src/common/ts/form-engine/package.json ./src/common/ts/form-engine/
COPY src/common/ts/language/package.json ./src/common/ts/language/
COPY src/common/ts/layout-contract/package.json ./src/common/ts/layout-contract/

ARG CYPRESS_INSTALL_BINARY=0
ARG PUPPETEER_SKIP_DOWNLOAD=true
ENV CYPRESS_INSTALL_BINARY=${CYPRESS_INSTALL_BINARY}
ENV PUPPETEER_SKIP_DOWNLOAD=${PUPPETEER_SKIP_DOWNLOAD}

# Agent Sandboxes mount their CA bundle here; this step's Node downloads trust it.
RUN if [ -r /run/agent/tls/ca-bundle.pem ]; then \
      export NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem; \
    fi; \
    yarn --immutable

COPY . .
RUN cd src/Designer/frontend && yarn build

# Building the backend
# The same Ubuntu as the final image, so that what dotnet publish builds for the build machine, such as the native
# launcher, also runs there.
FROM mcr.microsoft.com/dotnet/sdk:10.0-resolute@sha256:667f3cee6f24afb202d3e32c7941e3800bbac57dd70bb68f89e52a6245aff88f AS generate-studio-backend
ARG DESIGNER_VERSION=''
WORKDIR /build
COPY src/common/dotnet/Altinn.Studio.Common ./src/common/dotnet/Altinn.Studio.Common
COPY src/common/dotnet/Altinn.Studio.Common.Telemetry ./src/common/dotnet/Altinn.Studio.Common.Telemetry
COPY src/cli/.editorconfig src/cli/Directory.Build.props src/cli/Directory.Packages.props ./src/cli/
COPY src/cli/common/dotnet/.editorconfig src/cli/common/dotnet/Directory.Build.props ./src/cli/common/dotnet/
COPY src/cli/common/dotnet/Altinn.Studio.AppDist ./src/cli/common/dotnet/Altinn.Studio.AppDist
COPY src/Designer/backend ./src/Designer/backend
RUN dotnet publish src/Designer/backend/src/Designer/Designer.csproj -c Release -o /app_output /p:CSharpier_Bypass=true \
  "/p:InformationalVersion=${DESIGNER_VERSION:-dev}"
RUN rm -f /app_output/Altinn.Studio.Designer.staticwebassets.runtime.json
# Create version file
WORKDIR /version
RUN echo "{\"version\": \"${DESIGNER_VERSION}\"}" > version.json

# Prepare app templates, one release tree per selectable template.
# The "<id>/src" shape mirrors src/App/template exactly, so a locally run Designer can point straight
# at the repository folder without a second path convention. rsync will not create intermediate
# directories, hence the mkdir.
FROM alpine@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a AS app-template-release
RUN apk add --no-cache rsync
RUN mkdir -p /app-template-release/v8 /app-template-release/v9

COPY ./src/App/template/v8/src /app-template-dotnet-src/v8
WORKDIR /app-template-dotnet-src/v8
RUN rsync . -rv --exclude-from=.releaseignore --exclude-from=.gitignore /app-template-release/v8/src

COPY ./src/App/template/v9/src /app-template-dotnet-src/v9
WORKDIR /app-template-dotnet-src/v9
RUN rsync . -rv --exclude-from=.releaseignore --exclude-from=.gitignore /app-template-release/v9/src

# Building the final image. The chiseled image has no shell or package manager, so this stage only copies files.
# Its -extra variant adds ICU and time zones, which Designer needs.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-resolute-chiseled-extra@sha256:41db8302b4b08401ccf2bf139b02b37460da8872179d793899782ec0ef90933a AS final
WORKDIR /app
# Designer's database connections never use Kerberos. Without this, Npgsql looks for the Kerberos library, which the
# image does not have, and the runtime prints an error at startup. A connection string can still set the mode.
ENV PGGSSENCMODE=disable

COPY --from=generate-studio-backend /app_output .

COPY --from=generate-studio-frontend /build/src/Designer/frontend/app-development/dist ./wwwroot/editor/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/admin/dist ./wwwroot/admin/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/dashboard/dist ./wwwroot/dashboard/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/studio-root/dist ./wwwroot/info/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/app-preview/dist ./wwwroot/preview/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/resourceadm/dist ./wwwroot/resourceadm/
COPY --from=generate-studio-frontend /build/src/Designer/frontend/settings/dist ./wwwroot/settings/

COPY --from=generate-studio-backend /version/version.json ./wwwroot/designer/version.json

## Copying app templates. GeneralSettings decides which one new applications default to.
COPY --from=app-template-release /app-template-release ./Templates/AspNet

USER $APP_UID
ENTRYPOINT ["dotnet", "Altinn.Studio.Designer.dll"]

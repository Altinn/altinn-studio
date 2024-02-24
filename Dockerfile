# Building studio frontend
FROM node:lts-alpine AS generate-studio-frontend
WORKDIR /build

COPY ./package.json yarn.lock ./
COPY ./development/azure-devops-mock/package.json ./development/azure-devops-mock/
COPY ./frontend/app-development/package.json ./frontend/app-development/
COPY ./frontend/app-preview/package.json ./frontend/app-preview/
COPY ./frontend/dashboard/package.json ./frontend/dashboard/
COPY ./frontend/language/package.json ./frontend/language/
COPY ./frontend/libs/studio-components/package.json ./frontend/libs/studio-components/
COPY ./frontend/libs/studio-icons/package.json ./frontend/libs/studio-icons/
COPY ./frontend/libs/studio-pure-functions/package.json ./frontend/libs/studio-pure-functions/
COPY ./frontend/packages/policy-editor/package.json ./frontend/packages/policy-editor/
COPY ./frontend/packages/process-editor/package.json ./frontend/packages/process-editor/
COPY ./frontend/packages/schema-editor/package.json ./frontend/packages/schema-editor/
COPY ./frontend/packages/schema-model/package.json ./frontend/packages/schema-model/
COPY ./frontend/packages/shared/package.json ./frontend/packages/shared/

COPY ./frontend/packages/text-editor/package.json ./frontend/packages/text-editor/

COPY ./frontend/packages/ux-editor/package.json ./frontend/packages/ux-editor/

COPY ./frontend/packages/ux-editor-v3/package.json ./frontend/packages/ux-editor-v3/

COPY ./frontend/resourceadm/package.json ./frontend/resourceadm/

COPY ./frontend/scripts/package.json ./frontend/scripts/
COPY ./frontend/scripts/yarn.lock ./frontend/scripts/

COPY ./frontend/studio-root/package.json ./frontend/studio-root/

COPY ./frontend/testing/cypress/package.json ./frontend/testing/cypress/
COPY ./frontend/testing/mockend/package.json ./frontend/testing/mockend/

COPY ./frontend/testing/playwright/package.json ./frontend/testing/playwright/

COPY ./.yarn ./.yarn
COPY ./.yarnrc.yml ./.yarnrc.yml

RUN yarn --immutable

COPY . .
RUN yarn build

# Building the backend
FROM mcr.microsoft.com/dotnet/sdk:6.0-alpine AS generate-studio-backend
WORKDIR /build
COPY backend .
RUN dotnet build src/Designer/Designer.csproj -c Release -o /app_output
RUN dotnet publish src/Designer/Designer.csproj -c Release -o /app_output
RUN rm -f /app_output/Altinn.Studio.Designer.staticwebassets.runtime.json
# Prepare app template
WORKDIR /app_template
RUN apk add jq zip
RUN wget -O - https://api.github.com/repos/Altinn/app-template-dotnet/releases/latest | jq '.assets[]|select(.name | startswith("app-template-dotnet-") and endswith(".zip"))' | jq '.browser_download_url' | xargs wget -O apptemplate.zip && unzip apptemplate.zip && rm apptemplate.zip

# Building the final image
FROM mcr.microsoft.com/dotnet/aspnet:6.0-alpine AS final
EXPOSE 80
WORKDIR /app
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
  DOTNET_RUNNING_IN_CONTAINER=true
RUN apk add --no-cache icu-libs krb5-libs libgcc libintl libssl1.1 libstdc++ zlib

COPY --from=generate-studio-backend /app_output .
COPY --from=generate-studio-frontend /build/frontend/dist/app-development ./wwwroot/designer/frontend/app-development
COPY --from=generate-studio-frontend /build/frontend/dist/app-preview ./wwwroot/designer/frontend/app-preview
COPY --from=generate-studio-frontend /build/frontend/dist/dashboard ./wwwroot/designer/frontend/dashboard
COPY --from=generate-studio-frontend /build/frontend/dist/resourceadm ./wwwroot/designer/frontend/resourceadm
COPY --from=generate-studio-frontend /build/frontend/dist/language ./wwwroot/designer/frontend/lang
COPY --from=generate-studio-frontend /build/frontend/dist/studio-root ./wwwroot/designer/frontend/studio-root

## Copying app template
COPY --from=generate-studio-backend /app_template ./Templates/AspNet
COPY backend/src/Designer/Migration ./Migration

ENTRYPOINT ["dotnet", "Altinn.Studio.Designer.dll"]

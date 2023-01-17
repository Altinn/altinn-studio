# Building studio frontend
FROM node:alpine AS generate-studio-frontend
WORKDIR /build
COPY frontend .
RUN corepack enable
RUN yarn --immutable
RUN yarn build

# Building studio frontend static served by the backend
FROM node:alpine AS generate-designer-js
WORKDIR /build
COPY backend/src/Designer .
RUN corepack enable
RUN yarn --immutable
RUN yarn build

# Building the backend
FROM mcr.microsoft.com/dotnet/sdk:6.0-alpine AS generate-studio-backend
WORKDIR /build
COPY backend ./
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

COPY --from=generate-designer-js    /build/wwwroot ./wwwroot
COPY --from=generate-studio-backend /app_output .
COPY --from=generate-studio-frontend /build/dist/app-development ./wwwroot/designer/frontend/app-development
COPY --from=generate-studio-frontend /build/dist/dashboard ./wwwroot/designer/frontend/dashboard
COPY --from=generate-studio-frontend /build/dist/language ./wwwroot/designer/frontend/lang

## Copying app template
COPY --from=generate-studio-backend /app_template ./Templates/AspNet
COPY backend/src/Designer/Migration ./Migration

ENTRYPOINT ["dotnet", "Altinn.Studio.Designer.dll"]

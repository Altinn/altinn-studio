# Building studio frontend
FROM node:alpine AS generate-studio-frontend
WORKDIR /build
COPY ./src/designer/frontend .
RUN corepack enable
RUN yarn --immutable
RUN yarn build

# Building studio frontend static served by the backend
FROM node:alpine AS generate-designer-js
WORKDIR /build
COPY src/designer/backend .
RUN corepack enable
RUN yarn --immutable
RUN yarn build

# Building the backend
FROM mcr.microsoft.com/dotnet/sdk:6.0-alpine AS generate-studio-backend
WORKDIR /build
COPY src/designer/Designer.sln ./
COPY src/designer/backend ./designer/
COPY src/designer/DataModeling ./DataModeling/
RUN dotnet build designer/Designer.csproj -c Release -o /app_output
RUN dotnet publish designer/Designer.csproj -c Release -o /app_output
RUN rm -f /app_output/Altinn.Studio.Designer.staticwebassets.runtime.json

# Building the final image
FROM mcr.microsoft.com/dotnet/aspnet:6.0-alpine AS final
EXPOSE 80
WORKDIR /app
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    DOTNET_RUNNING_IN_CONTAINER=true
RUN apk add --no-cache icu-libs krb5-libs libgcc libintl libssl1.1 libstdc++ zlib

COPY --from=generate-designer-js    /build/wwwroot ./wwwroot
COPY --from=generate-studio-backend /app_output .
COPY --from=generate-studio-frontend /build/dist/app-development ./wwwroot/designer/frontend
COPY --from=generate-studio-frontend /build/dist/dashboard ./wwwroot/designer/frontend
COPY --from=generate-studio-frontend /build/dist/language ./wwwroot/designer/frontend/lang

## Copying app template
## TODO: find out how to reference files outside docker context
COPY /AppTemplates/AspNet ./Templates/AspNet
COPY src/designer/backend/Migration ./Migration

ENTRYPOINT ["dotnet", "Altinn.Studio.Designer.dll"]

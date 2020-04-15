FROM node:12.16.2-alpine3.11 AS generate-designer-js
COPY src/designer/backend/package.json .
COPY src/designer/backend/package-lock.json .
RUN npm ci
COPY src/designer/backend .
RUN npm run gulp build

FROM mcr.microsoft.com/dotnet/core/sdk:3.1.201-alpine AS build
COPY src/designer/backend ./designer/
COPY --from=generate-designer-js /wwwroot ./designer/wwwroot

RUN dotnet build designer/Designer.csproj -c Release -o /app_output
RUN dotnet publish designer/Designer.csproj -c Release -o /app_output

# Altinn-Studio app-development
FROM altinn-studio-app-development:latest AS altinn-studio-app-development

# Altinn-Studio Dashboard
FROM altinn-studio-dashboard:latest AS altinn-studio-dashboard

FROM mcr.microsoft.com/dotnet/core/aspnet:3.1.3-alpine AS final
EXPOSE 80
WORKDIR /app
COPY --from=build /app_output .
COPY --from=altinn-studio-app-development /dist/app-development.js ./wwwroot/designer/js/react/app-development.js
COPY --from=altinn-studio-app-development /dist/0.app-development.js ./wwwroot/designer/js/react/0.app-development.js
COPY --from=altinn-studio-app-development /dist/1.app-development.js ./wwwroot/designer/js/react/1.app-development.js
COPY --from=altinn-studio-app-development /dist/2.app-development.js ./wwwroot/designer/js/react/2.app-development.js
COPY --from=altinn-studio-app-development /dist/3.app-development.js ./wwwroot/designer/js/react/3.app-development.js
COPY --from=altinn-studio-app-development /dist/editor.worker.js ./wwwroot/designer/js/react/editor.worker.js
COPY --from=altinn-studio-app-development /dist/typescript.worker.js ./wwwroot/designer/js/react/typescript.worker.js
COPY --from=altinn-studio-app-development /dist/app-development.css ./wwwroot/designer/css/react/app-development.css
COPY --from=altinn-studio-dashboard /dist/dashboard.js ./wwwroot/designer/js/react/dashboard.js
COPY --from=altinn-studio-dashboard /dist/dashboard.css ./wwwroot/designer/css/dashboard.css

## Copying app template
## TODO: how to solve this?
COPY /AppTemplates/AspNet/App ./Templates/AspNet/App
COPY /AppTemplates/AspNet/deployment ./Templates/AspNet/deployment
COPY /AppTemplates/AspNet/.gitignore ./Templates/AspNet
COPY /AppTemplates/AspNet/App.sln ./Templates/AspNet

COPY src/designer/backend/Languages/ini ./Languages


ENTRYPOINT ["dotnet", "Altinn.Studio.Designer.dll"]

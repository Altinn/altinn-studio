# studio frontend
FROM node:14.17.6-alpine3.14 AS generate-studio-frontend

# Copy and install Lerna
COPY ./src/designer/frontend/lerna.json .
COPY ./src/designer/frontend/package.json .
COPY ./src/designer/frontend/package-lock.json .
RUN npm ci

# Copy and install npm dependencies
COPY ./src/designer/frontend/shared/package.json /shared/
COPY ./src/designer/frontend/shared/package-lock.json /shared/
COPY ./src/designer/frontend/app-development/package.json /app-development/
COPY ./src/designer/frontend/app-development/package-lock.json /app-development/
COPY ./src/designer/frontend/ux-editor/package.json /ux-editor/
COPY ./src/designer/frontend/ux-editor/package-lock.json /ux-editor/
COPY ./src/designer/frontend/dashboard/package.json ./dashboard/
COPY ./src/designer/frontend/dashboard/package-lock.json ./dashboard/
COPY ./src/designer/frontend/packages/schema-editor/package.json /packages/schema-editor/
COPY ./src/designer/frontend/packages/schema-editor/package-lock.json /packages/schema-editor/

RUN npm run install-deps

# Copy shared, app-development, ux-editor and dashboard
WORKDIR /
COPY ./src/designer/frontend/shared/ ./shared/
COPY ./src/designer/frontend/app-development/ ./app-development/
COPY ./src/designer/frontend/ux-editor ./ux-editor/
COPY ./src/designer/frontend/dashboard/ ./dashboard/
COPY ./src/designer/frontend/packages/schema-editor/ ./packages/schema-editor/

# Build app-development
RUN npm run build --prefix /app-development

# Build dashboard
RUN npm run build --prefix /dashboard

# Create altinn-studio-frontend base image
FROM alpine as altinn-studio-frontend
WORKDIR /dist/
COPY --from=generate-studio-frontend /dist/app-development/app-development.js .
COPY --from=generate-studio-frontend /dist/app-development/1.app-development.js .
COPY --from=generate-studio-frontend /dist/app-development/2.app-development.js .
COPY --from=generate-studio-frontend /dist/app-development/3.app-development.js .
COPY --from=generate-studio-frontend /dist/app-development/4.app-development.js .
COPY --from=generate-studio-frontend /dist/app-development/editor.worker.js .
COPY --from=generate-studio-frontend /dist/app-development/ts.worker.js .
COPY --from=generate-studio-frontend /dist/app-development/app-development.css .
COPY --from=generate-studio-frontend /dist/dashboard/dashboard.js .
COPY --from=generate-studio-frontend /dist/dashboard/dashboard.css .

FROM node:14.17.6-alpine3.14 AS generate-designer-js
COPY src/designer/backend/package.json .
COPY src/designer/backend/package-lock.json .
RUN npm ci
COPY src/designer/backend .
RUN npm run gulp build

FROM mcr.microsoft.com/dotnet/sdk:5.0.401-alpine3.14 AS build
COPY src/designer/backend ./designer/
COPY --from=generate-designer-js /wwwroot ./designer/wwwroot

RUN dotnet build designer/Designer.csproj -c Release -o /app_output
RUN dotnet publish designer/Designer.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/aspnet:5.0.10-alpine3.14 AS final
EXPOSE 80
WORKDIR /app
COPY --from=build /app_output .
COPY --from=altinn-studio-frontend /dist/app-development.js ./wwwroot/designer/js/react/app-development.js
COPY --from=altinn-studio-frontend /dist/1.app-development.js ./wwwroot/designer/js/react/1.app-development.js
COPY --from=altinn-studio-frontend /dist/2.app-development.js ./wwwroot/designer/js/react/2.app-development.js
COPY --from=altinn-studio-frontend /dist/3.app-development.js ./wwwroot/designer/js/react/3.app-development.js
COPY --from=altinn-studio-frontend /dist/4.app-development.js ./wwwroot/designer/js/react/4.app-development.js
COPY --from=altinn-studio-frontend /dist/editor.worker.js ./wwwroot/designer/js/react/editor.worker.js
COPY --from=altinn-studio-frontend /dist/ts.worker.js ./wwwroot/designer/js/react/ts.worker.js
COPY --from=altinn-studio-frontend /dist/app-development.css ./wwwroot/designer/css/react/app-development.css
COPY --from=altinn-studio-frontend /dist/dashboard.js ./wwwroot/designer/js/react/dashboard.js
COPY --from=altinn-studio-frontend /dist/dashboard.css ./wwwroot/designer/css/dashboard.css

## Copying app template
## TODO: find out how to reference files outside docker context
COPY /AppTemplates/AspNet ./Templates/AspNet

COPY src/designer/backend/Languages/ini ./Languages

COPY src/designer/backend/Migration ./Migration

ENTRYPOINT ["dotnet", "Altinn.Studio.Designer.dll"]

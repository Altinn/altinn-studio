FROM node:10.13.0 AS generate-designer-js
COPY /src/AltinnCore/Designer/package.json .
RUN npm install
COPY /src/AltinnCore/Designer .
RUN npm run gulp build

#dotnet:2.1.300-sdk
FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS build
COPY /src/AltinnCore ./AltinnCore/
COPY --from=generate-designer-js /wwwroot /AltinnCore/Designer/wwwroot
RUN dotnet build AltinnCore/Designer/AltinnCore.Designer.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore/Designer/AltinnCore.Designer.csproj -c Release -o /app_output

# Altinn-Studio Service-Development
FROM altinn-studio-service-development:latest AS altinn-studio-service-development

# Altinn-Studio Dashboard
FROM altinn-studio-dashboard:latest AS altinn-studio-dashboard

#dotnet:2.1.300-sdk
FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS final
EXPOSE 80
WORKDIR /app
COPY --from=build /app_output .
COPY --from=altinn-studio-service-development /dist/service-development.js ./wwwroot/designer/js/react/service-development.js
COPY --from=altinn-studio-service-development /dist/service-development.css ./wwwroot/designer/css/react/service-development.css
COPY --from=altinn-studio-dashboard /dist/dashboard.js ./wwwroot/designer/js/react/dashboard.js
COPY --from=altinn-studio-dashboard /dist/dashboard.css ./wwwroot/designer/css/dashboard.css
RUN mv Templates ..
RUN mv Testdata ..

ENTRYPOINT ["dotnet", "AltinnCore.Designer.dll"]

FROM node:10.13.0 AS generate-react-apps
COPY /src/react-apps .
RUN npm install
RUN npm run install-deps
RUN npm run  --prefix applications/service-development build
RUN npm run  --prefix applications/dashboard build

FROM node:10.13.0 AS generate-designer-js
COPY /src/AltinnCore/Designer .
RUN npm install
RUN npm run gulp build

#dotnet:2.1.300-sdk
FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS build
COPY /src .
COPY --from=generate-designer-js /wwwroot /AltinnCore/Designer/wwwroot
COPY --from=generate-react-apps ./applications/service-development/dist/service-development.js /AltinnCore/Designer/wwwroot/designer/js/react/service-development.js
COPY --from=generate-react-apps ./applications/dashboard/dist/dashboard.js /AltinnCore/Designer/wwwroot/designer/js/react/dashboard.js
COPY --from=generate-react-apps ./applications/service-development/dist/service-development.css /AltinnCore/Designer/wwwroot/designer/css/react/service-development.css
COPY --from=generate-react-apps ./applications/dashboard/dist/dashboard.css /AltinnCore/Designer/wwwroot/designer/css/dashboard.css
RUN dotnet build AltinnCore/Designer/AltinnCore.Designer.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore/Designer/AltinnCore.Designer.csproj -c Release -o /app_output

#dotnet:2.1.300-sdk
FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS final
EXPOSE 80
WORKDIR /app
COPY --from=build /app_output .
RUN mv Templates ..
RUN mv Testdata ..
ENTRYPOINT ["dotnet", "AltinnCore.Designer.dll"]

FROM node:9.5.0 AS generate-js-files
COPY . /t30
WORKDIR /t30/src/react-apps/ux-editor
RUN npm install
RUN npm run build
WORKDIR /t30/src/AltinnCore/Designer
RUN npm install
RUN npm run gulp build
WORKDIR /t30
COPY ./src/react-apps/ux-editor/dist/*.js /src/AltinnCore/Designer/wwwroot/designer/js/formbuilder/
COPY ./src/react-apps/ux-editor/dist/*.css /src/AltinnCore/Designer/wwwroot/designer/css/


FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS build
COPY --from=generate-js-files /t30 /t30
WORKDIR /t30/src/AltinnCore/Designer
RUN dotnet build AltinnCore.Designer.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore.Designer.csproj -c Release -o /app_output

FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS final
EXPOSE 80
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "AltinnCore.Designer.dll"]
FROM node:9.5.0 AS generate-js-files
COPY . /t30
WORKDIR /t30/src/react-apps/ux-editor
RUN npm install
WORKDIR /t30/src/AltinnCore/Designer
RUN npm install
RUN npm run gulp build

FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS build
WORKDIR /t30/
COPY . .
WORKDIR /t30/src/AltinnCore/Designer
RUN dotnet build AltinnCore.Designer.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore.Designer.csproj -c Release -o /app_output

FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS final
EXPOSE 80
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "AltinnCore.Designer.dll"]

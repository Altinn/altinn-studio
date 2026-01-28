FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:e0f7abfb9c18aa419198b2c4e05dc2f7fd864a6098f09bddb1ceb2b0bce67685 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:51cad1febb4c7b062339359c18962e43e44f7b46308c0712e413535350eeff71 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "KubernetesWrapper.dll"]

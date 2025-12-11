FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:e0f7abfb9c18aa419198b2c4e05dc2f7fd864a6098f09bddb1ceb2b0bce67685 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:be36809e32840cf9fcbf1a3366657c903e460d3c621d6593295a5e5d02268a0d AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "KubernetesWrapper.dll"]

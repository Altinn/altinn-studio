FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:7a74ab148e8f05d8333a40fbe98a8b9e4726a70221381909707dc1b654147f1c AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:07c48612ac44393b15e741734761cf1f30cdb8f7e645e66e25b4563681ceef99 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "KubernetesWrapper.dll"]

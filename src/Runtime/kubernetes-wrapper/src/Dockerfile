FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine@sha256:9b4b31da5246f575086b1901e9871b189ae2a80eb42fe9234e9d000b51febd4b AS build
WORKDIR /src

# Copy restore inputs and restore as distinct layer
COPY Directory.Packages.props ./
COPY Directory.Build.props ./
COPY global.json ./
COPY .csharpierignore ./
COPY .csharpierrc.yaml ./
COPY src/*.csproj ./src/
RUN dotnet restore ./src/Altinn.Studio.KubernetesWrapper.csproj

# Copy everything else and build
COPY src/. ./src/
RUN dotnet publish ./src/Altinn.Studio.KubernetesWrapper.csproj -c Release -o /app/out --no-restore

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine@sha256:49dce27611d8fe4fbe50483ea9438abd18ccb0198d0737af231335244d0c9b94 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

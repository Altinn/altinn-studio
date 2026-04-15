FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine@sha256:16fcd544bb71edae6abee5b2ea25bc5f372734f18568d81c64ebac74d6f00239 AS build
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
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine@sha256:8c7671a6f0f984d0c102ee70d61e8010857de032b320561dea97cc5781aea5f8 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

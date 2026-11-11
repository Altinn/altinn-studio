FROM mcr.microsoft.com/dotnet/sdk:11.0-resolute@sha256:65f3c7c6a25a239ab3e6719f2896147e7b68242ff2d8818dd70498bde6ef8bea AS build

WORKDIR /build

COPY common/dotnet/Altinn.Studio.Common/Altinn.Studio.Common.csproj common/dotnet/Altinn.Studio.Common/
COPY common/dotnet/Altinn.Studio.Common/.editorconfig common/dotnet/Altinn.Studio.Common/
COPY common/dotnet/Altinn.Studio.Common.Telemetry/Altinn.Studio.Common.Telemetry.csproj common/dotnet/Altinn.Studio.Common.Telemetry/
COPY common/dotnet/Altinn.Studio.Common.Telemetry/.editorconfig common/dotnet/Altinn.Studio.Common.Telemetry/
COPY core/preview/Directory.Packages.props core/preview/
COPY core/preview/src/Altinn.Studio.Preview/Altinn.Studio.Preview.csproj core/preview/src/Altinn.Studio.Preview/

RUN dotnet restore core/preview/src/Altinn.Studio.Preview/Altinn.Studio.Preview.csproj

COPY common/dotnet/Altinn.Studio.Common/src/ common/dotnet/Altinn.Studio.Common/src/
COPY common/dotnet/Altinn.Studio.Common.Telemetry/src/ common/dotnet/Altinn.Studio.Common.Telemetry/src/
COPY core/preview/src/Altinn.Studio.Preview/ core/preview/src/Altinn.Studio.Preview/

# The image's build, the commit the deploy workflow builds from: the telemetry's service.version.
ARG BUILD_VERSION=dev
RUN dotnet publish core/preview/src/Altinn.Studio.Preview/Altinn.Studio.Preview.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:InformationalVersion=$BUILD_VERSION

FROM mcr.microsoft.com/dotnet/aspnet:11.0-resolute-chiseled@sha256:fc0ee12f9ea79bde6cda88c7a34e5467fe383dbb62276be0ec13e5e9cc1654ac AS final
WORKDIR /app

# 8080 is the public port and 8081 the internal one; see src/Altinn.Studio.Preview/Hosting/PreviewPorts.cs.
EXPOSE 8080 8081

COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["dotnet", "Altinn.Studio.Preview.dll"]

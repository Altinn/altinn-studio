FROM mcr.microsoft.com/dotnet/sdk:10.0-resolute@sha256:667f3cee6f24afb202d3e32c7941e3800bbac57dd70bb68f89e52a6245aff88f AS build

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

FROM mcr.microsoft.com/dotnet/aspnet:10.0-resolute-chiseled@sha256:6018ff839e76c1bc9aa58d60c2ba8e596061363c88d8f4f7e45d1c19b6205eaf AS final
WORKDIR /app

# 8080 is the public port and 8081 the internal one; see src/Altinn.Studio.Preview/Hosting/PreviewPorts.cs.
EXPOSE 8080 8081

COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["dotnet", "Altinn.Studio.Preview.dll"]

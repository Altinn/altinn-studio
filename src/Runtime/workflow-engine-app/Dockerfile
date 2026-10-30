FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:de0ee358cdd672f7017a003bed21e9ac9ed48a27c922a59b18175b6e82fa7fee AS base
USER $APP_UID
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=9090
EXPOSE 9090

FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:de4fe90a98845d75910b9769662465c84de1a934665c431279d1382b2bddc02b AS build
ARG BUILD_CONFIGURATION=Release
ARG BUILD_VERSION=dev
WORKDIR /build

COPY common/dotnet/Altinn.Studio.Common/ common/dotnet/Altinn.Studio.Common/
COPY common/dotnet/Altinn.Studio.Common.Telemetry/ common/dotnet/Altinn.Studio.Common.Telemetry/
COPY Runtime/workflow-engine/ Runtime/workflow-engine/
COPY Runtime/workflow-engine-app/ Runtime/workflow-engine-app/

# Prune host build artifacts, including literal backslash dirs such as `bin\Debug`.
RUN find common Runtime -type d \( -name 'bin*' -o -name 'obj*' \) -prune -exec rm -rf '{}' +

WORKDIR /build/Runtime/workflow-engine-app/src/WorkflowEngine.App
# Warnings fail builds and tests, not image builds. Publish raises warnings of its own, which must not block an image.
RUN dotnet restore "WorkflowEngine.App.csproj" /p:TreatWarningsAsErrors=false
RUN dotnet publish "WorkflowEngine.App.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false /p:CSharpier_Bypass=true /p:TreatWarningsAsErrors=false /p:InformationalVersion=$BUILD_VERSION

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorkflowEngine.App.dll"]

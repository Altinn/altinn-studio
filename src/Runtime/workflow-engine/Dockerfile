FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:aac50ceef10391e78a899e3d2ccd00bbafa2dcb56ccf4586cbccf00edb84fc21 AS base
USER $APP_UID
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=9090
EXPOSE 9090

FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:de4fe90a98845d75910b9769662465c84de1a934665c431279d1382b2bddc02b AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /build

COPY common/dotnet/Altinn.Studio.Common/ common/dotnet/Altinn.Studio.Common/
COPY common/dotnet/Altinn.Studio.Common.Telemetry/ common/dotnet/Altinn.Studio.Common.Telemetry/
COPY Runtime/workflow-engine/ Runtime/workflow-engine/

# Prune host build artifacts, including literal backslash dirs such as `bin\Debug`.
RUN find common Runtime -type d \( -name 'bin*' -o -name 'obj*' \) -prune -exec rm -rf '{}' +

WORKDIR /build/Runtime/workflow-engine/tests/WorkflowEngine.TestApp
# Warnings fail builds and tests, not image builds. Publish raises warnings of its own, which must not block an image.
RUN dotnet restore "WorkflowEngine.TestApp.csproj" /p:TreatWarningsAsErrors=false
RUN dotnet publish "WorkflowEngine.TestApp.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false /p:CSharpier_Bypass=true /p:RunAnalyzers=false /p:TreatWarningsAsErrors=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorkflowEngine.TestApp.dll"]

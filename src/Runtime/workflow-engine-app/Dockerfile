FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:d5633778c754e89a386882eddf8dbee6942447a8a4b8267c19cf1e1158d0b0ac AS base
USER $APP_UID
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=9090
EXPOSE 9090

FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:747cbade5bfd918a175ac32f8f1d931edec2c7d0d5397a3de72eaef1ac1f66d2 AS build
ARG BUILD_CONFIGURATION=Release
ARG BUILD_VERSION=dev
WORKDIR /build

COPY common/dotnet/Altinn.Studio.Common/ common/dotnet/Altinn.Studio.Common/
COPY Runtime/workflow-engine/ Runtime/workflow-engine/
COPY Runtime/workflow-engine-app/ Runtime/workflow-engine-app/

# Prune host build artifacts, including literal backslash dirs such as `bin\Debug`.
RUN find common Runtime -type d \( -name 'bin*' -o -name 'obj*' \) -prune -exec rm -rf '{}' +

WORKDIR /build/Runtime/workflow-engine-app/src/WorkflowEngine.App
RUN dotnet restore "WorkflowEngine.App.csproj"
RUN dotnet publish "WorkflowEngine.App.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false /p:CSharpier_Bypass=true /p:InformationalVersion=$BUILD_VERSION

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorkflowEngine.App.dll"]

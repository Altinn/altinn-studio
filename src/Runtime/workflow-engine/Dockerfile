FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:a04d1c1d2d26119049494057d80ea6cda25bbd8aef7c444a1fc1ef874fd3955b AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:adc02be8b87957d07208a4a3e51775935b33bad3317de8c45b1e67357b4c073b AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /build

COPY common/ common/
COPY Runtime/workflow-engine/ Runtime/workflow-engine/

WORKDIR /build/Runtime/workflow-engine/tests/WorkflowEngine.TestApp
RUN dotnet restore "WorkflowEngine.TestApp.csproj"
RUN dotnet publish "WorkflowEngine.TestApp.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorkflowEngine.TestApp.dll"]

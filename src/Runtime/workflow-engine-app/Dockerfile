FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /build

COPY common/ common/
COPY Runtime/workflow-engine/ Runtime/workflow-engine/
COPY Runtime/workflow-engine-app/ Runtime/workflow-engine-app/

WORKDIR /build/Runtime/workflow-engine-app/src/WorkflowEngine.App
RUN dotnet restore "WorkflowEngine.App.csproj"
RUN dotnet build "WorkflowEngine.App.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "WorkflowEngine.App.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "WorkflowEngine.App.dll"]

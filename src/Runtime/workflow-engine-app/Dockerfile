FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:1fa23fc4872d95fd71c2833ebe65d7e84a43b2d51a31d119516852f13d9505a7 AS base
USER $APP_UID
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=9090
EXPOSE 9090

FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:ea8bde36c11b6e7eec2656d0e59101d4462f6bd630730f2c8201ed0572b295d5 AS build
ARG BUILD_CONFIGURATION=Release
ARG BUILD_VERSION=dev
WORKDIR /build

COPY common/ common/
COPY Runtime/workflow-engine/ Runtime/workflow-engine/
COPY Runtime/workflow-engine-app/ Runtime/workflow-engine-app/

WORKDIR /build/Runtime/workflow-engine-app/src/WorkflowEngine.App
RUN dotnet restore "WorkflowEngine.App.csproj"
RUN dotnet publish "WorkflowEngine.App.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false /p:CSharpier_Bypass=true /p:InformationalVersion=$BUILD_VERSION

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorkflowEngine.App.dll"]

FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:1fa23fc4872d95fd71c2833ebe65d7e84a43b2d51a31d119516852f13d9505a7 AS base
USER $APP_UID
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=9090
EXPOSE 9090

FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:ed034a8bf0b24ded0cbbac07e17825d8e9ebfe21e308191d0f7421eaf5ad4664 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /build

COPY common/ common/
COPY Runtime/workflow-engine/ Runtime/workflow-engine/

WORKDIR /build/Runtime/workflow-engine/tests/WorkflowEngine.TestApp
RUN dotnet restore "WorkflowEngine.TestApp.csproj"
RUN dotnet publish "WorkflowEngine.TestApp.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false /p:CSharpier_Bypass=true

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorkflowEngine.TestApp.dll"]

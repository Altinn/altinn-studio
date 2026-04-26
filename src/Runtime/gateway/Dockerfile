FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:478b9038d187e5b5c29bfa8173ded5d29e864b5ad06102a12106380ee01e2e49 AS build

# Install native AOT build prerequisites
RUN apt-get update && apt-get install -y clang zlib1g-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy project files and package management
COPY common/Altinn.Studio.Runtime.Common.csproj common/
COPY Runtime/gateway/Directory.Packages.props Runtime/gateway/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Api/Altinn.Studio.Gateway.Api.csproj Runtime/gateway/src/Altinn.Studio.Gateway.Api/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/Altinn.Studio.Gateway.Contracts.csproj Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/

# Restore dependencies
RUN dotnet restore Runtime/gateway/src/Altinn.Studio.Gateway.Api/Altinn.Studio.Gateway.Api.csproj

# Copy source code
COPY common/src/ common/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Api/ Runtime/gateway/src/Altinn.Studio.Gateway.Api/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/ Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/

# Build and publish native AOT
WORKDIR /build/Runtime/gateway/src/Altinn.Studio.Gateway.Api/
RUN dotnet publish -c Release -o /app/publish /p:CSharpier_Bypass=true

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:48f41b8c5c965a37872d9a2afd7126708d3dc6d058c857403014b67ccd3dc8ba
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./Altinn.Studio.Gateway.Api"]

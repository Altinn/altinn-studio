FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:d1823fecac3689a2eb959e02ee3bfe1c2142392808240039097ad70644566190 AS build

# Install native AOT build prerequisites
RUN apt-get update && apt-get install -y clang zlib1g-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy project files and package management
COPY common/Altinn.Studio.Runtime.Common.csproj common/
COPY StudioGateway/Directory.Packages.props .
COPY StudioGateway/src/StudioGateway.Api/StudioGateway.Api.csproj app/studio-gateway/StudioGateway.Api/
COPY StudioGateway/src/StudioGateway.Contracts/StudioGateway.Contracts.csproj app/studio-gateway/StudioGateway.Contracts/

# Restore dependencies
RUN dotnet restore app/studio-gateway/StudioGateway.Api/StudioGateway.Api.csproj

# Copy source code
COPY common/src/ common/
COPY StudioGateway/src/StudioGateway.Api/ app/studio-gateway/StudioGateway.Api/
COPY StudioGateway/src/StudioGateway.Contracts/ app/studio-gateway/StudioGateway.Contracts/

# Build and publish native AOT
WORKDIR /build/app/studio-gateway/StudioGateway.Api/
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:63a9bb50127de1c5ef7258a3dad27a7769d18a4f5558ab4ae1c243bce7517770
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./StudioGateway.Api"]

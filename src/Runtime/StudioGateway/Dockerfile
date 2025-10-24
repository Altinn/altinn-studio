FROM mcr.microsoft.com/dotnet/sdk:9.0-noble@sha256:d88e637d15248531967111fba05c6725ad45ea1dace3d35d8cfe2c4d4094e25d AS build

# Install native AOT build prerequisites
RUN apt-get update && apt-get install -y clang zlib1g-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy project file and package management
COPY Directory.Packages.props .
COPY src/StudioGateway.Api/StudioGateway.Api.csproj StudioGateway.Api/

# Restore dependencies
RUN dotnet restore StudioGateway.Api/StudioGateway.Api.csproj

# Copy source code
COPY src/StudioGateway.Api/ StudioGateway.Api/

# Build and publish native AOT
WORKDIR /build/StudioGateway.Api
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime-deps:9.0-noble-chiseled@sha256:c3d80b2b56f53938f4ac452791e78a4d344b80bbea3925d0339cf738a1ab4f1f
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./StudioGateway.Api"]

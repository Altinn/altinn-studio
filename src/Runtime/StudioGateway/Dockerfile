FROM mcr.microsoft.com/dotnet/sdk:9.0-noble@sha256:5646faeafd2992e0b75f44ce8afc6f79a398e767aff5e9ed5579cce5e6047f25 AS build

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

FROM mcr.microsoft.com/dotnet/runtime-deps:9.0-noble-chiseled@sha256:e17d399464d9978eda3cd7481087e89dee5d6f032a375c0b28f32c6b3c7b2840
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./StudioGateway.Api"]

FROM mcr.microsoft.com/dotnet/sdk:9.0-noble AS build

# Install native AOT build prerequisites
RUN apt-get update && apt-get install -y clang zlib1g-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Copy solution and project files
COPY StudioGateway.sln .
COPY src/StudioGateway.Api/StudioGateway.Api.csproj src/StudioGateway.Api/

# Restore dependencies
RUN dotnet restore

# Copy source code
COPY src/ src/

# Build and publish native AOT
WORKDIR /src/src/StudioGateway.Api
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime-deps:9.0-noble-chiseled
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./StudioGateway.Api"]

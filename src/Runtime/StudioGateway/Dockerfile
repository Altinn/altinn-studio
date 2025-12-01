FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:c7445f141c04f1a6b454181bd098dcfa606c61ba0bd213d0a702489e5bd4cd71 AS build

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

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:b857c8cb8d929183cfe4c6dd9994abba92a2639dd2dbaf06005379f815991604
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./StudioGateway.Api"]

FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:e362a8dbcd691522456da26a5198b8f3ca1d7641c95624fadc5e3e82678bd08a AS build

# Install native AOT build prerequisites
RUN apt-get update && apt-get install -y clang zlib1g-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy project files and package management
COPY Runtime/gateway/Directory.Packages.props .
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Api/Altinn.Studio.Gateway.Api.csproj Altinn.Studio.Gateway.Api/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/Altinn.Studio.Gateway.Contracts.csproj Altinn.Studio.Gateway.Contracts/

# Restore dependencies
RUN dotnet restore Altinn.Studio.Gateway.Api/Altinn.Studio.Gateway.Api.csproj

# Copy source code
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Api/ Altinn.Studio.Gateway.Api/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/ Altinn.Studio.Gateway.Contracts/

# Build and publish native AOT
WORKDIR /build/Altinn.Studio.Gateway.Api
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:48f41b8c5c965a37872d9a2afd7126708d3dc6d058c857403014b67ccd3dc8ba
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./Altinn.Studio.Gateway.Api"]

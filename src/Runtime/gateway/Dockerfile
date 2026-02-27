FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:e362a8dbcd691522456da26a5198b8f3ca1d7641c95624fadc5e3e82678bd08a AS build

# Install native AOT build prerequisites
RUN apt-get update && apt-get install -y clang zlib1g-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy project files and package management
COPY Runtime/common/Altinn.Studio.Runtime.Common.csproj common/
COPY Runtime/gateway/Directory.Packages.props .
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Api/Altinn.Studio.Gateway.Api.csproj app/gateway/Altinn.Studio.Gateway.Api/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/Altinn.Studio.Gateway.Contracts.csproj app/gateway/Altinn.Studio.Gateway.Contracts/

# Restore dependencies
RUN dotnet restore app/gateway/Altinn.Studio.Gateway.Api/Altinn.Studio.Gateway.Api.csproj

# Copy source code
COPY Runtime/common/src/ common/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Api/ app/gateway/Altinn.Studio.Gateway.Api/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/ app/gateway/Altinn.Studio.Gateway.Contracts/

# Build and publish native AOT
WORKDIR /build/app/gateway/Altinn.Studio.Gateway.Api/
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:705078da2d6bbe95ee2ae1dc4733b08b01dd6ff1fa72eaae5e87719ba294cd99
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./Altinn.Studio.Gateway.Api"]

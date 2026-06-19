FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:548d93f8a18a1acbe6cc127bc4f47281430d34a9e35c18afa80a8d6741c2adc3 AS build

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

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:9cae0b131d058693c8d7496fed4a188380f05f27f34c98dd9a516b4d0331b0c4
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./Altinn.Studio.Gateway.Api"]

FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:72dd743782f2ae7e5476fd64f6a460045e3998dc862218b80e6944cba79a01b0 AS build

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

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:bc6ba0158e93277ca1a5bc0881d13b08e6ca7f6d98db623592095eaf7fd7a816
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./Altinn.Studio.Gateway.Api"]

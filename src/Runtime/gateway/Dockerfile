FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:747cbade5bfd918a175ac32f8f1d931edec2c7d0d5397a3de72eaef1ac1f66d2 AS build

# Install native AOT build prerequisites
RUN apt-get update && apt-get install -y clang zlib1g-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy project files and package management
COPY common/dotnet/Altinn.Studio.Common/Altinn.Studio.Common.csproj common/dotnet/Altinn.Studio.Common/
COPY common/dotnet/Altinn.Studio.Common/.editorconfig common/dotnet/Altinn.Studio.Common/
COPY Runtime/gateway/Directory.Packages.props Runtime/gateway/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Api/Altinn.Studio.Gateway.Api.csproj Runtime/gateway/src/Altinn.Studio.Gateway.Api/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/Altinn.Studio.Gateway.Contracts.csproj Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/

# Restore dependencies
RUN dotnet restore Runtime/gateway/src/Altinn.Studio.Gateway.Api/Altinn.Studio.Gateway.Api.csproj

# Copy source code
COPY common/dotnet/Altinn.Studio.Common/src/ common/dotnet/Altinn.Studio.Common/src/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Api/ Runtime/gateway/src/Altinn.Studio.Gateway.Api/
COPY Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/ Runtime/gateway/src/Altinn.Studio.Gateway.Contracts/

# Build and publish native AOT
WORKDIR /build/Runtime/gateway/src/Altinn.Studio.Gateway.Api/
RUN dotnet publish -c Release -o /app/publish /p:CSharpier_Bypass=true

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:2c2757fcb6e0dbf9030f6a47d950233e21008d0da838583587044418b4e80d46
WORKDIR /app
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["./Altinn.Studio.Gateway.Api"]

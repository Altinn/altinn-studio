# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0@sha256:e6a5a8d884609907fa8d468b927df765967f6b22f890ce92bd3ae614ca4ae87e AS build
WORKDIR /app-root-dir

COPY AppLibDotnet.sln .
COPY test/Altinn.App.Api.Tests/Altinn.App.Api.Tests.csproj test/Altinn.App.Api.Tests/
COPY test/Altinn.App.Core.Tests/Altinn.App.Core.Tests.csproj test/Altinn.App.Core.Tests/
COPY test/Altinn.App.Tests.Common/Altinn.App.Tests.Common.csproj test/Altinn.App.Tests.Common/
COPY src/Altinn.App.Api/Altinn.App.Api.csproj src/Altinn.App.Api/
COPY src/Altinn.App.Core/Altinn.App.Core.csproj src/Altinn.App.Core/
COPY src/Altinn.App.Internal.Analyzers/Altinn.App.Internal.Analyzers.csproj src/Altinn.App.Internal.Analyzers/
COPY src/Altinn.App.Analyzers/Altinn.App.Analyzers.csproj src/Altinn.App.Analyzers/
COPY Directory.* ./
COPY src/Directory.* ./src/
COPY test/Directory.* ./test/

RUN dotnet restore
COPY . .

RUN dotnet test

# Run in project root with
# docker build --progress=plain -f test/Dockerfile .
# or
# DOCKER_BUILDKIT=0 docker build -f test/Dockerfile .

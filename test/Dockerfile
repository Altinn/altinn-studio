# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0@sha256:2d7f935b8c7fe032cd3d36b5ce9c82c24413881e6dad1b4fbdf36cf369e4244f AS build
WORKDIR /app

COPY AppLibDotnet.sln .
COPY test/Altinn.App.Api.Tests/Altinn.App.Api.Tests.csproj test/Altinn.App.Api.Tests/
COPY test/Altinn.App.Core.Tests/Altinn.App.Core.Tests.csproj test/Altinn.App.Core.Tests/
COPY src/Altinn.App.Api/Altinn.App.Api.csproj src/Altinn.App.Api/
COPY src/Altinn.App.Core/Altinn.App.Core.csproj src/Altinn.App.Core/
RUN dotnet restore

COPY . .

RUN dotnet test

# Run in project root with
# docker build --progress=plain -f test/Dockerfile .
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0@sha256:1875fc5f4be6211c22c4353aafd6b13279c0175f277fbfa53d52375d99e8a9b8 AS build
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
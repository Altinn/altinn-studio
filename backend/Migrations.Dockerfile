FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

WORKDIR /app

COPY . .

RUN dotnet build src/Designer/Designer.csproj -c Release

RUN dotnet tool install --version 8.0.7 --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

ENTRYPOINT ["sh", "-c", "dotnet ef database update --no-build --project src/Designer/Designer.csproj --connection \"$CONNECTION\""]

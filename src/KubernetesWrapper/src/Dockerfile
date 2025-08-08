FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:2fe880002c458a6e95a3f8bb38b63c0f2e21ffefcb01c0223c4408cc91ad7d9d AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:91e477e260390e2fc18987e552daf7958491c2e247bf07ae3b876e4f629b6504 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "KubernetesWrapper.dll"]

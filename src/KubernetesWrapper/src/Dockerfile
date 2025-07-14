FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:35c77bbcd86b3153f9d7d6b2e88ae99d300e5a570cf2827501c0ba8b0aacdf08 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:53867b9ebb86beab644de47226867d255d0360e38324d2afb3ff4d2f2933e33f AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "KubernetesWrapper.dll"]

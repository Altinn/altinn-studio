FROM mcr.microsoft.com/dotnet/sdk:6.0.400-1-alpine3.16 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:6.0.8-alpine3.16 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "KubernetesWrapper.dll"]

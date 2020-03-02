FROM mcr.microsoft.com/dotnet/core/sdk:3.1.102-alpine AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1.2-alpine AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "KubernetesWrapper.dll"]

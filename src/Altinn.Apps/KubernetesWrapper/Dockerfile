FROM mcr.microsoft.com/dotnet/sdk:5.0.401-alpine3.14 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:5.0.10-alpine3.14 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "KubernetesWrapper.dll"]

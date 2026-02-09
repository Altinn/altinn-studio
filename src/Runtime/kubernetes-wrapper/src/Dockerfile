FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:e0f7abfb9c18aa419198b2c4e05dc2f7fd864a6098f09bddb1ceb2b0bce67685 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:56f0ed1f866f9db4fa0969dc2cd222d50a41800f455107e63f5bcca76c0b4cff AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

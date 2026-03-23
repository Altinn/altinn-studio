FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine@sha256:2b0e46d490f5b53a8dc07fbf636cdf5b90796878a256e1ce5b441e8d9675c5f4 AS build
WORKDIR /src

# Copy restore inputs and restore as distinct layer
COPY Directory.Packages.props ./
COPY Directory.Build.props ./
COPY global.json ./
COPY .csharpierignore ./
COPY .csharpierrc.yaml ./
COPY src/*.csproj ./src/
RUN dotnet restore ./src/Altinn.Studio.KubernetesWrapper.csproj

# Copy everything else and build
COPY src/. ./src/
RUN dotnet publish ./src/Altinn.Studio.KubernetesWrapper.csproj -c Release -o /app/out --no-restore

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine@sha256:49dce27611d8fe4fbe50483ea9438abd18ccb0198d0737af231335244d0c9b94 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

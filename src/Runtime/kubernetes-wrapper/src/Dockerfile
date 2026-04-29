FROM mcr.microsoft.com/dotnet/sdk:10.0.203-alpine3.23@sha256:0191ff386e93923edf795d363ea0ae0669ce467ada4010b370644b670fa495c1 AS build
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
RUN dotnet publish ./src/Altinn.Studio.KubernetesWrapper.csproj -c Release -o /app/out --no-restore /p:CSharpier_Bypass=true

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0.7-alpine3.23@sha256:60eb031b554df75a4b9f358290a2fa15d8961a3bc79b47bb34a00e31f7b78c69 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

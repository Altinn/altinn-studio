FROM mcr.microsoft.com/dotnet/sdk:10.0.403-alpine3.24@sha256:5562fd626eec39f6f53218f9b7d7856ab7195d51d846568304fbe85071a3b6e6 AS build
WORKDIR /src

# Copy restore inputs and restore as distinct layer
COPY Runtime/kubernetes-wrapper/Directory.Packages.props ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/Directory.Build.props ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/global.json ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/.csharpierignore ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/.csharpierrc.yaml ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/src/*.csproj ./Runtime/kubernetes-wrapper/src/
COPY common/dotnet/Altinn.Studio.Common/Altinn.Studio.Common.csproj ./common/dotnet/Altinn.Studio.Common/
COPY common/dotnet/Altinn.Studio.Common/.editorconfig ./common/dotnet/Altinn.Studio.Common/
# Warnings fail builds and tests, not image builds. Publish raises warnings of its own, which must not block an image.
RUN dotnet restore ./Runtime/kubernetes-wrapper/src/Altinn.Studio.KubernetesWrapper.csproj /p:TreatWarningsAsErrors=false

# Copy everything else and build
COPY Runtime/kubernetes-wrapper/src/. ./Runtime/kubernetes-wrapper/src/
COPY common/dotnet/Altinn.Studio.Common/src/. ./common/dotnet/Altinn.Studio.Common/src/
RUN dotnet publish ./Runtime/kubernetes-wrapper/src/Altinn.Studio.KubernetesWrapper.csproj -c Release -o /app/out --no-restore /p:CSharpier_Bypass=true /p:TreatWarningsAsErrors=false

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0.14-alpine3.24@sha256:486297ae006e95ee2ee3112a2c03e3d26e41fbbc64b7a29e28e7a18cc36b12bb AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

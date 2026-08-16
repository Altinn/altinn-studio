FROM mcr.microsoft.com/dotnet/sdk:10.0.302-alpine3.23@sha256:d8ee39817ca03a3757288e83c37ed73cc969a286c603b827c7cbe33add1c2d1c AS build
WORKDIR /src

# Copy restore inputs and restore as distinct layer
COPY Runtime/kubernetes-wrapper/Directory.Packages.props ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/Directory.Build.props ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/global.json ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/.csharpierignore ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/.csharpierrc.yaml ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/src/*.csproj ./Runtime/kubernetes-wrapper/src/
COPY common/dotnet/Altinn.Studio.Common/Altinn.Studio.Common.csproj ./common/dotnet/Altinn.Studio.Common/
RUN dotnet restore ./Runtime/kubernetes-wrapper/src/Altinn.Studio.KubernetesWrapper.csproj

# Copy everything else and build
COPY Runtime/kubernetes-wrapper/src/. ./Runtime/kubernetes-wrapper/src/
COPY common/dotnet/Altinn.Studio.Common/src/. ./common/dotnet/Altinn.Studio.Common/src/
RUN dotnet publish ./Runtime/kubernetes-wrapper/src/Altinn.Studio.KubernetesWrapper.csproj -c Release -o /app/out --no-restore /p:CSharpier_Bypass=true

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0.10-alpine3.23@sha256:27b6b84beeede74fd16886177d360799c8e4299ceadfbd64eef57bafead7878a AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

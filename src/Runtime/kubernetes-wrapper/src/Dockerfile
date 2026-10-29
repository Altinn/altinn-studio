FROM mcr.microsoft.com/dotnet/sdk:10.0.402-alpine3.24@sha256:496914451b05ac5a24592024362ec370c3a2d3c3fe817f864e4aa55c4c194a56 AS build
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
RUN dotnet restore ./Runtime/kubernetes-wrapper/src/Altinn.Studio.KubernetesWrapper.csproj

# Copy everything else and build
COPY Runtime/kubernetes-wrapper/src/. ./Runtime/kubernetes-wrapper/src/
COPY common/dotnet/Altinn.Studio.Common/src/. ./common/dotnet/Altinn.Studio.Common/src/
RUN dotnet publish ./Runtime/kubernetes-wrapper/src/Altinn.Studio.KubernetesWrapper.csproj -c Release -o /app/out --no-restore /p:CSharpier_Bypass=true

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0.13-alpine3.24@sha256:ecf8dcbaab8ebc4bdfb2322d6fe4217bbb118894310ebb6d53c580874ab4b27d AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

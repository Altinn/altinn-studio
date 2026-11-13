FROM mcr.microsoft.com/dotnet/sdk:10.0.404-alpine3.24@sha256:0294f285d062afacc8b5f6d7febb0cd4ee879320e5585fa15f2f4ebf1feb9ba7 AS build
WORKDIR /src

# Copy restore inputs and restore as distinct layer
COPY Runtime/kubernetes-wrapper/Directory.Packages.props ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/Directory.Build.props ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/global.json ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/.csharpierignore ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/.csharpierrc.yaml ./Runtime/kubernetes-wrapper/
COPY Runtime/kubernetes-wrapper/src/*.csproj ./Runtime/kubernetes-wrapper/src/
COPY common/dotnet/Altinn.Studio.Common/Altinn.Studio.Common.csproj ./common/dotnet/Altinn.Studio.Common/
# Warnings fail builds and tests, not image builds. Publish raises warnings of its own, which must not block an image.
RUN dotnet restore ./Runtime/kubernetes-wrapper/src/Altinn.Studio.KubernetesWrapper.csproj /p:TreatWarningsAsErrors=false

# Copy everything else and build
COPY Runtime/kubernetes-wrapper/src/. ./Runtime/kubernetes-wrapper/src/
COPY common/dotnet/Altinn.Studio.Common/src/. ./common/dotnet/Altinn.Studio.Common/src/
RUN dotnet publish ./Runtime/kubernetes-wrapper/src/Altinn.Studio.KubernetesWrapper.csproj -c Release -o /app/out --no-restore /p:CSharpier_Bypass=true /p:RunAnalyzers=false /p:TreatWarningsAsErrors=false

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0.15-alpine3.24@sha256:21c3f9798416cba4c0576a947c286231cb71ea2884896cb968253f5c9668f930 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

FROM mcr.microsoft.com/dotnet/sdk:10.0.403-alpine3.24@sha256:cc02b814237a76c4735fb6eeee87181597b5e56f2ce458a435e527674d91f4d7 AS build
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
FROM mcr.microsoft.com/dotnet/aspnet:10.0.14-alpine3.24@sha256:254fe017495996d3abcc487ffacdcce2b73affb380d3af87af12c8dff41fe0b0 AS final
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "Altinn.Studio.KubernetesWrapper.dll"]

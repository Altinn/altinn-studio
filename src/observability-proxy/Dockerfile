FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:548d93f8a18a1acbe6cc127bc4f47281430d34a9e35c18afa80a8d6741c2adc3 AS build

# Install native AOT build prerequisites
RUN apt-get update && apt-get install -y clang zlib1g-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY Directory.Build.props ./
COPY Directory.Packages.props ./
COPY .editorconfig ./
COPY global.json ./
COPY .csharpierignore ./
COPY .csharpierrc.yaml ./
COPY src/Altinn.Studio.Observability.Proxy/Altinn.Studio.Observability.Proxy.csproj src/Altinn.Studio.Observability.Proxy/
RUN dotnet restore src/Altinn.Studio.Observability.Proxy/Altinn.Studio.Observability.Proxy.csproj

COPY src/Altinn.Studio.Observability.Proxy/ src/Altinn.Studio.Observability.Proxy/
RUN dotnet publish src/Altinn.Studio.Observability.Proxy/Altinn.Studio.Observability.Proxy.csproj \
    -c Release \
    -o /app/out \
    --no-restore \
    /p:CSharpier_Bypass=true

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:9cae0b131d058693c8d7496fed4a188380f05f27f34c98dd9a516b4d0331b0c4 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/out .

USER $APP_UID
ENTRYPOINT ["./Altinn.Studio.Observability.Proxy"]

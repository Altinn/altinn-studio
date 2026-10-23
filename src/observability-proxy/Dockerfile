FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:747cbade5bfd918a175ac32f8f1d931edec2c7d0d5397a3de72eaef1ac1f66d2 AS build

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

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:2c2757fcb6e0dbf9030f6a47d950233e21008d0da838583587044418b4e80d46 AS final
WORKDIR /app

# 8080 serves traffic and 9090 only /metrics: ObservabilityProxy:Port and
# ObservabilityProxy:MetricsPort, on which the proxy listens itself.
EXPOSE 8080 9090

COPY --from=build /app/out .

USER $APP_UID
ENTRYPOINT ["./Altinn.Studio.Observability.Proxy"]

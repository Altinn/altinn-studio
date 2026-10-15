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

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled@sha256:8d23bb82cd8345ee51738b36c6da8e2f89ded7a547bc25fa52d5cc60e37f6d7a AS final
WORKDIR /app

# 8080 serves traffic and 9090 only /metrics: ObservabilityProxy:Port and
# ObservabilityProxy:MetricsPort, on which the proxy listens itself.
EXPOSE 8080 9090

COPY --from=build /app/out .

USER $APP_UID
ENTRYPOINT ["./Altinn.Studio.Observability.Proxy"]

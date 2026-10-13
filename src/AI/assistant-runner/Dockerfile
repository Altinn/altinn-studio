FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:548d93f8a18a1acbe6cc127bc4f47281430d34a9e35c18afa80a8d6741c2adc3 AS build

WORKDIR /src

COPY Directory.Build.props ./
COPY Directory.Packages.props ./
COPY .editorconfig ./
COPY global.json ./
COPY .csharpierignore ./
COPY .csharpierrc.yaml ./
COPY src/Altinn.Studio.Assistant.Runner/Altinn.Studio.Assistant.Runner.csproj src/Altinn.Studio.Assistant.Runner/
RUN dotnet restore src/Altinn.Studio.Assistant.Runner/Altinn.Studio.Assistant.Runner.csproj

COPY src/Altinn.Studio.Assistant.Runner/ src/Altinn.Studio.Assistant.Runner/
RUN dotnet publish src/Altinn.Studio.Assistant.Runner/Altinn.Studio.Assistant.Runner.csproj \
    -c Release \
    -o /app \
    --no-restore \
    /p:CSharpier_Bypass=true

# The jobs run `dotnet build`, so the final image is the SDK image too.
FROM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:548d93f8a18a1acbe6cc127bc4f47281430d34a9e35c18afa80a8d6741c2adc3 AS final

# A new studioctl version goes to production only through a reviewed change of these two values.
# AGENTS.md tells how to update them.
ARG STUDIOCTL_VERSION=v0.1.0-preview.28
ARG STUDIOCTL_INSTALL_SCRIPT_SHA256=eb7a7661cc59234a20174f9eaa10845cd750abfa0d2c3bf84ca7ff5c9c257ab7

# tini is PID 1, so it reaps the processes that a job leaves.
# The jobs run app code as app-build. The service runs as root, only to start them as that user.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin app-build

# The installer checks the binaries against the checksums of the release. studioctl-server goes to
# /opt/studioctl, which root owns and app-build can only read and run. Each job links to it from its
# own studioctl home.
RUN curl -fsSL \
        "https://github.com/Altinn/altinn-studio/releases/download/studioctl/${STUDIOCTL_VERSION}/install.sh" \
        -o /tmp/studioctl-install.sh \
    && echo "${STUDIOCTL_INSTALL_SCRIPT_SHA256}  /tmp/studioctl-install.sh" | sha256sum -c - \
    && STUDIOCTL_HOME=/opt/studioctl sh /tmp/studioctl-install.sh \
        --version "${STUDIOCTL_VERSION}" \
        --install-dir /usr/local/bin \
    && rm /tmp/studioctl-install.sh \
    && test "$(STUDIOCTL_HOME=/opt/studioctl studioctl version)" = "studioctl ${STUDIOCTL_VERSION}" \
    && chmod -R go+rX,go-w /opt/studioctl \
    && setpriv --reuid=app-build --regid=app-build --clear-groups \
        test -x /opt/studioctl/bin/studioctl-server/studioctl-server

WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080
# Nothing attaches a debugger or a profiler to the service.
ENV DOTNET_EnableDiagnostics=0
EXPOSE 8080

ENTRYPOINT ["tini", "--", "dotnet", "Altinn.Studio.Assistant.Runner.dll"]

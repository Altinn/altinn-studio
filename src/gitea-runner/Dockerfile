FROM gitea/act_runner:0.2.13@sha256:8477d5b61b655caad4449888bae39f1f34bebd27db56cb15a62dccb3dcf3a944 AS gitea-basic

FROM ghcr.io/renovatebot/renovate:42.34.1@sha256:76265a40295d41facff1967a60e893fbce7de39e4975bc2b63884a8482170e39 AS renovate

FROM gitea/runner-images:ubuntu-latest@sha256:b9664fce18708fd10af52aa0f43f9fdd273b13adce43e3bff894698c8e3d75c7 AS final

# Install required packages for the runner
RUN apt update && \
    apt install -y tini bash git && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Copy binary and run script from basic gitea image and setup entrypoint
COPY --from=gitea-basic /usr/local/bin/act_runner /usr/local/bin/act_runner
# COPY --from=gitea-basic /usr/local/bin/run.sh /usr/local/bin/run.sh
COPY ./run.sh /usr/local/bin/run.sh

# Copy renovate and its containerbase dependencies for runtime tool installation
COPY --from=renovate /usr/local/sbin/renovate /usr/local/bin/renovate
COPY --from=renovate /usr/local/sbin/containerbase-cli /usr/local/sbin/containerbase-cli
COPY --from=renovate /usr/local/renovate /usr/local/renovate
COPY --from=renovate /usr/local/etc/env /usr/local/etc/env
COPY --from=renovate /usr/local/containerbase /usr/local/containerbase
COPY --from=renovate /opt/containerbase /opt/containerbase
COPY --from=renovate /tmp/containerbase /tmp/containerbase

ENTRYPOINT ["/usr/bin/tini","--","/usr/local/bin/run.sh"]

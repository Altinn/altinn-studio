FROM gitea/act_runner:0.2.13@sha256:8477d5b61b655caad4449888bae39f1f34bebd27db56cb15a62dccb3dcf3a944 AS gitea-basic

FROM ghcr.io/renovatebot/renovate:37.20.2@sha256:3633789a934f763d4fcfcf8f94aee68c229c9cdafc5817900c40b51b437af081 AS renovate

FROM gitea/runner-images:ubuntu-latest@sha256:aa3ed75f3903fb8bbb10b5ca945821fa4e196a501ae9c0033aff9cb3529faf3b AS final

# Install required packages for the runner
RUN apt update && \
    apt install -y tini bash git && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Copy binary and run script from basic gitea image and setup entrypoint
COPY --from=gitea-basic /usr/local/bin/act_runner /usr/local/bin/act_runner
# COPY --from=gitea-basic /usr/local/bin/run.sh /usr/local/bin/run.sh
COPY ./run.sh /usr/local/bin/run.sh

# Copy renovate and its containerbase dependencies
COPY --from=renovate /usr/local/bin/renovate /usr/local/bin/renovate
COPY --from=renovate /usr/local/etc/env /usr/local/etc/env
COPY --from=renovate /opt/containerbase /opt/containerbase

ENTRYPOINT ["/usr/bin/tini","--","/usr/local/bin/run.sh"]

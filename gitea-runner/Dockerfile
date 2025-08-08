FROM gitea/act_runner:0.2.12@sha256:62a561c82dd67ec77ea600db7eac78ac5fed8e2244950fbf1829c54da12e8e54 AS gitea-basic

FROM ghcr.io/renovatebot/renovate:37.440.7@sha256:1ee424e0ed4d8e64e5bb2d442d6bc72b3809bb9d0cf804f4b7180caa47d6002a AS renovate

FROM gitea/runner-images:ubuntu-latest@sha256:41915f7815dc95f8ac258cace2dab85b0d7fef40926ad24b5b15d4a06a2375f5 AS final

# Install required packages for the runner
RUN apt update && \
    apt install -y tini bash git && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Copy binary and run script from basic gitea image and setup entrypoint
COPY --from=gitea-basic /usr/local/bin/act_runner /usr/local/bin/act_runner
# COPY --from=gitea-basic /usr/local/bin/run.sh /usr/local/bin/run.sh
COPY ./run.sh /usr/local/bin/run.sh

# Copy the renovate binary from the renovate image
COPY --from=renovate /usr/local/bin/renovate /usr/local/bin/renovate
COPY --from=renovate /opt/containerbase /opt/containerbase

ENTRYPOINT ["/usr/bin/tini","--","/usr/local/bin/run.sh"]

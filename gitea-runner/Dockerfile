FROM gitea/act_runner:nightly@sha256:5331fb42ad6d6af04e5ee0837c3a44d118a7f6af63c5e10d3db53db780b9f256 AS gitea-basic

FROM ghcr.io/renovatebot/renovate:37.440.7@sha256:1ee424e0ed4d8e64e5bb2d442d6bc72b3809bb9d0cf804f4b7180caa47d6002a AS renovate

FROM gitea/runner-images:ubuntu-latest@sha256:a84581a9556459ad257dfeb2ba65f2bfb0a07aa8a5041e59751f042054e3bf34 AS final

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

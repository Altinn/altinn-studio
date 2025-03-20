FROM gitea/act_runner:0.2.11 AS gitea-basic

FROM gitea/runner-images:ubuntu-latest AS final

# Install required packages for the runner
RUN apt update && \
    apt install -y tini bash git && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Copy binary and run script from basic gitea image and setup entrypoint
# Note that in the next version of act_runner, the run.sh script will change the path from /opt/act/run.sh
COPY --from=gitea-basic /usr/local/bin/act_runner /usr/local/bin/act_runner
COPY --from=gitea-basic /opt/act/run.sh /opt/act/run.sh

## Configure runner
COPY runner-config.yaml /config.yaml
ENV CONFIG_FILE=/config.yaml

ENTRYPOINT ["/usr/bin/tini","--","/opt/act/run.sh"]

FROM gitea/act_runner:nightly AS gitea-basic

FROM gitea/runner-images:ubuntu-latest AS final

# Install required packages for the runner
RUN apt update && \
    apt install -y tini bash git && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Copy binary and run script from basic gitea image and setup entrypoint
COPY --from=gitea-basic /usr/local/bin/act_runner /usr/local/bin/act_runner
# COPY --from=gitea-basic /usr/local/bin/run.sh /usr/local/bin/run.sh
COPY ./run.sh /usr/local/bin/run.sh

ENTRYPOINT ["/usr/bin/tini","--","/usr/local/bin/run.sh"]

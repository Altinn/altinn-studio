FROM gitea/act_runner:0.2.11 as gitea-basic

FROM ubuntu:24.04 as final

# Install required packages for the runner
RUN apt update
RUN apt install -y tini bash git

# Copy binary and run script from basic gitea image and setup entrypoint
COPY --from=gitea-basic /usr/local/bin/act_runner /usr/local/bin/act_runner
COPY --from=gitea-basic /opt/act/run.sh /opt/act/run.sh

# Note that in the next version of act_runner, the run.sh script will be change the location

## Configure runner
COPY runner-config.yaml /config.yaml
ENV CONFIG_FILE=/config.yaml

ENTRYPOINT ["/usr/bin/tini","--","/opt/act/run.sh"]


# Install node and npm
RUN apt install -y nodejs npm



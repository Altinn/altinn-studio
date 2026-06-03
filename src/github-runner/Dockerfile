FROM ghcr.io/actions/actions-runner:2.330.0@sha256:ee54ad8776606f29434f159196529b7b9c83c0cb9195c1ff5a7817e7e570dcfe

USER root

COPY run.sh /usr/local/bin/altinn-github-runner
RUN chmod +x /usr/local/bin/altinn-github-runner

USER runner
WORKDIR /home/runner

ENTRYPOINT ["/usr/local/bin/altinn-github-runner"]

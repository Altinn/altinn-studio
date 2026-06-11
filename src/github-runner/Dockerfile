FROM ghcr.io/actions/actions-runner:2.330.0@sha256:ee54ad8776606f29434f159196529b7b9c83c0cb9195c1ff5a7817e7e570dcfe

USER root

COPY run.sh /usr/local/bin/altinn-github-runner
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      git \
      jq \
      make \
      pkg-config \
      tar \
      unzip \
    && rm -rf /var/lib/apt/lists/* \
    && chmod +x /usr/local/bin/altinn-github-runner \
    && mkdir -p \
      /home/runner/.cache/go-build \
      /home/runner/.cache/yarn \
      /home/runner/.nuget/packages \
      /home/runner/go/pkg/mod \
      /home/runner/_work/_tool \
    && chown -R runner:runner /home/runner/.cache /home/runner/.nuget /home/runner/go /home/runner/_work

ENV CGO_ENABLED=1
ENV RUNNER_TOOL_CACHE=/home/runner/_work/_tool

USER runner
WORKDIR /home/runner

ENTRYPOINT ["/usr/local/bin/altinn-github-runner"]

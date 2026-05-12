FROM gitea/runner:1.0.0@sha256:2198bd3bf2d31059ecd27e845569aa4d666f26d15a0a3cc9abb85898368a0eab AS gitea-basic

FROM ghcr.io/renovatebot/renovate:42.34.1@sha256:76265a40295d41facff1967a60e893fbce7de39e4975bc2b63884a8482170e39 AS renovate

FROM gitea/runner-images:ubuntu-latest@sha256:1bb015dad66f7634fc2fe65a8e678f8c749b9116f10e6f6b5ea185b205f93dc9 AS final

# Install required packages for the runner
RUN apt update && \
    apt install -y tini bash git && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Copy binary and run script from basic gitea image and setup entrypoint
COPY --from=gitea-basic /usr/local/bin/gitea-runner /usr/local/bin/gitea-runner
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

# studioctl conventions. The install script lands the binary in $HOME/.local/bin
# and studioctl self install uses BinDir = STUDIOCTL_HOME/bin. Pre-populate PATH
# with both so workflows can call `studioctl` without appending to $GITHUB_PATH.
# STUDIOCTL_HOME is set to /root/.cache/act/studioctl so studioctl writes its
# state under the act_runner cache dir tree.
#
# NOTE: /root/.cache/act/studioctl must be inside a directory mounted as a
# shared emptyDir between the runner and the dockerd sidecar. See the
# gitea-org-runner chart: shareWorkspace.path must cover this path, otherwise
# dockerd will not see studioctl's testdata and localtest bind mounts will fail.
ENV PATH="/root/.local/bin:/root/.cache/act/studioctl/bin:${PATH}"
ENV STUDIOCTL_HOME="/root/.cache/act/studioctl"
# STUDIOCTL_INSTALL_DIR makes the install script land the binary at a known
# path without prompting. Newer gitea-runner images allocate a pseudo-TTY
# for `run:` steps which breaks the install script's `! -t 0` non-interactive
# detection, so it would otherwise prompt for an install location.
ENV STUDIOCTL_INSTALL_DIR="/root/.local/bin"

ENTRYPOINT ["/usr/bin/tini","--","/usr/local/bin/run.sh"]

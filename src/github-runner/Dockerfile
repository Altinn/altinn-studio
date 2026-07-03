FROM ghcr.io/actions/actions-runner:2.335.1@sha256:08c30b0a7105f64bddfc485d2487a22aa03932a791402393352fdf674bda2c29

ARG GO_VERSION=1.26.4
ARG NODE_CHANNEL=22
ARG YARN_CHANNEL=stable
ARG DOTNET_CHANNELS="8.0 9.0 10.0"
ARG CHROME_FOR_TESTING_CHANNEL=Stable
ARG DOTNET_INSTALL_SCRIPT_COMMIT=6f559c420847ded38591392dafe785ad511f39f5
ARG DOTNET_INSTALL_SCRIPT_SHA256=082f7685e156738a1b2e2ed8381a621870d4ce8e8c59278034556f05c186eb2e

USER root

COPY run.sh /usr/local/bin/altinn-github-runner
COPY run-with-dockerd.sh /usr/local/bin/altinn-github-runner-dind
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      docker.io \
      docker-compose-v2 \
      e2fsprogs \
      fonts-liberation \
      git \
      iproute2 \
      iptables \
      jq \
      libasound2t64 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libexpat1 \
      libfontconfig1 \
      libgbm-dev \
      libgbm1 \
      libglib2.0-0 \
      libgtk-3-0 \
      libicu74 \
      libnotify-dev \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libpangocairo-1.0-0 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxcursor1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxi6 \
      libxrandr2 \
      libxrender1 \
      libxss1 \
      libxtst6 \
      lsb-release \
      make \
      pkg-config \
      tar \
      unzip \
      util-linux \
      wget \
      xauth \
      xdg-utils \
      xz-utils \
      xvfb \
      zstd \
    && CHROME_FOR_TESTING_URL="$(curl -fsSL "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json" \
      | jq -r --arg channel "${CHROME_FOR_TESTING_CHANNEL}" '.channels[$channel].downloads.chrome[] | select(.platform == "linux64") | .url')" \
    && test -n "${CHROME_FOR_TESTING_URL}" \
    && test "${CHROME_FOR_TESTING_URL}" != "null" \
    && curl -fsSL "${CHROME_FOR_TESTING_URL}" -o /tmp/chrome-for-testing.zip \
    && mkdir -p /opt/chrome-for-testing \
    && unzip -q /tmp/chrome-for-testing.zip -d /opt/chrome-for-testing \
    && rm -f /tmp/chrome-for-testing.zip \
    && mkdir -p /opt/google/chrome \
    && ln -s /opt/chrome-for-testing/chrome-linux64/chrome /opt/google/chrome/chrome \
    && ln -s /opt/chrome-for-testing/chrome-linux64/chrome /usr/bin/google-chrome \
    && ln -s /opt/chrome-for-testing/chrome-linux64/chrome /usr/bin/chrome \
    && rm -rf /var/lib/apt/lists/* \
    && chmod +x /usr/local/bin/altinn-github-runner \
    && chmod +x /usr/local/bin/altinn-github-runner-dind \
    && mkdir -p \
      /home/runner/.cache/go-build \
      /home/runner/.npm \
      /home/runner/.cache/yarn \
      /home/runner/.nuget/packages \
      /home/runner/go/pkg/mod \
      /home/runner/_work/_temp \
      /usr/share/dotnet \
      /opt/corepack \
    && test -n "${GO_VERSION}" \
    && GO_SHA256="$(curl -fsSL "https://go.dev/dl/?mode=json&include=all" \
      | jq -r --arg version "go${GO_VERSION}" --arg filename "go${GO_VERSION}.linux-amd64.tar.gz" '.[] | select(.version == $version) | .files[] | select(.filename == $filename) | .sha256')" \
    && test -n "${GO_SHA256}" \
    && test "${GO_SHA256}" != "null" \
    && curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tar.gz \
    && echo "${GO_SHA256}  /tmp/go.tar.gz" | sha256sum -c - \
    && mkdir -p "/opt/tools/go/${GO_VERSION}/x64" \
    && tar -xzf /tmp/go.tar.gz --strip-components=1 -C "/opt/tools/go/${GO_VERSION}/x64" \
    && rm -f /tmp/go.tar.gz \
    && touch "/opt/tools/go/${GO_VERSION}/x64.complete" \
    && ln -s "/opt/tools/go/${GO_VERSION}/x64" /opt/tools/go/current \
    && NODE_VERSION="$(curl -fsSL "https://nodejs.org/dist/index.json" \
      | jq -r --arg channel "v${NODE_CHANNEL}." '[.[] | select(.version | startswith($channel))][0].version | sub("^v"; "")')" \
    && test -n "${NODE_VERSION}" \
    && test "${NODE_VERSION}" != "null" \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" -o /tmp/node-shasums.txt \
    && NODE_SHA256="$(grep " node-v${NODE_VERSION}-linux-x64.tar.xz\$" /tmp/node-shasums.txt | awk '{ print $1 }')" \
    && test -n "${NODE_SHA256}" \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
    && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - \
    && mkdir -p "/opt/tools/node/${NODE_VERSION}/x64" \
    && tar -xJf /tmp/node.tar.xz --strip-components=1 -C "/opt/tools/node/${NODE_VERSION}/x64" \
    && rm -f /tmp/node.tar.xz /tmp/node-shasums.txt \
    && touch "/opt/tools/node/${NODE_VERSION}/x64.complete" \
    && ln -s "/opt/tools/node/${NODE_VERSION}/x64" /opt/tools/node/current \
    && curl -fsSL "https://raw.githubusercontent.com/dotnet/install-scripts/${DOTNET_INSTALL_SCRIPT_COMMIT}/src/dotnet-install.sh" -o /tmp/dotnet-install.sh \
    && echo "${DOTNET_INSTALL_SCRIPT_SHA256}  /tmp/dotnet-install.sh" | sha256sum -c - \
    && chmod +x /tmp/dotnet-install.sh \
    && for channel in ${DOTNET_CHANNELS}; do \
      /tmp/dotnet-install.sh --install-dir /usr/share/dotnet --channel "${channel}" --quality GA; \
    done \
    && rm -f /tmp/dotnet-install.sh \
    && PATH="/opt/tools/node/current/bin:${PATH}" COREPACK_HOME=/opt/corepack corepack enable \
    && PATH="/opt/tools/node/current/bin:${PATH}" COREPACK_HOME=/opt/corepack corepack prepare "yarn@${YARN_CHANNEL}" --activate \
    && git config --system checkout.workers 4 \
    && git config --system checkout.thresholdForParallelism 100 \
    && usermod -aG docker runner \
    && chown -R runner:runner /home/runner/.cache /home/runner/.npm /home/runner/.nuget /home/runner/go /home/runner/_work /opt/tools /opt/corepack

ENV CGO_ENABLED=1
ENV DOTNET_ROOT=/usr/share/dotnet
ENV DOTNET_INSTALL_DIR=/usr/share/dotnet
ENV COREPACK_HOME=/opt/corepack
ENV RUNNER_TOOL_CACHE=/opt/tools
ENV CHROME_PATH=/opt/chrome-for-testing/chrome-linux64/chrome
ENV PUPPETEER_EXECUTABLE_PATH=/opt/chrome-for-testing/chrome-linux64/chrome
ENV TMPDIR=/tmp
ENV TMP=/tmp
ENV TEMP=/tmp
ENV PATH=/opt/tools/go/current/bin:/opt/tools/node/current/bin:/usr/share/dotnet:${PATH}

USER runner
WORKDIR /home/runner

ENTRYPOINT ["/usr/local/bin/altinn-github-runner"]

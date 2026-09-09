FROM ubuntu:26.04@sha256:2260313b31c8c011cd2eebe728008efac1b3982be73eb71348ea2648d2c0e09b AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV DOTNET_ROOT=/usr/local/share/dotnet
ENV PATH=/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        fonts-liberation \
        git \
        jq \
        libicu-dev \
        libkrb5-dev \
        libssl-dev \
        pkg-config \
        procps \
        ripgrep \
        sudo \
        systemd \
        tmux \
    && rm -rf /var/lib/apt/lists/*

ARG TARGETARCH
ARG DOTNET_VERSION=10.0.302
ARG DOTNET_INSTALL_SCRIPT_COMMIT=6f559c420847ded38591392dafe785ad511f39f5
ARG DOTNET_INSTALL_SCRIPT_SHA256=082f7685e156738a1b2e2ed8381a621870d4ce8e8c59278034556f05c186eb2e
ARG GO_VERSION=1.26.4
ARG NODE_VERSION=22.23.2

RUN case "${TARGETARCH}" in \
        amd64) PORTABLE_ARCH=amd64; NODE_ARCH=x64; DOTNET_ARCH=x64 ;; \
        arm64) PORTABLE_ARCH=arm64; NODE_ARCH=arm64; DOTNET_ARCH=arm64 ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && GO_ARCHIVE="go${GO_VERSION}.linux-${PORTABLE_ARCH}.tar.gz" \
    && GO_SHA256="$(curl -fsSL 'https://go.dev/dl/?mode=json&include=all' \
        | jq -r --arg version "go${GO_VERSION}" --arg filename "${GO_ARCHIVE}" \
            '.[] | select(.version == $version) | .files[] | select(.filename == $filename) | .sha256')" \
    && test -n "${GO_SHA256}" \
    && test "${GO_SHA256}" != "null" \
    && curl -fsSL "https://go.dev/dl/${GO_ARCHIVE}" -o /tmp/go.tar.gz \
    && echo "${GO_SHA256}  /tmp/go.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/go.tar.gz -C /usr/local \
    && NODE_ARCHIVE="node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    && NODE_SHA256="$(curl -fsSL "https://nodejs.org/download/release/v${NODE_VERSION}/SHASUMS256.txt" \
        | awk -v filename="${NODE_ARCHIVE}" '$2 == filename { print $1 }')" \
    && test -n "${NODE_SHA256}" \
    && curl -fsSL "https://nodejs.org/download/release/v${NODE_VERSION}/${NODE_ARCHIVE}" -o /tmp/node.tar.xz \
    && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - \
    && tar -xJf /tmp/node.tar.xz --strip-components=1 -C /usr/local \
    && curl -fsSL \
        "https://raw.githubusercontent.com/dotnet/install-scripts/${DOTNET_INSTALL_SCRIPT_COMMIT}/src/dotnet-install.sh" \
        -o /tmp/dotnet-install.sh \
    && echo "${DOTNET_INSTALL_SCRIPT_SHA256}  /tmp/dotnet-install.sh" | sha256sum -c - \
    && bash /tmp/dotnet-install.sh \
        --architecture "${DOTNET_ARCH}" \
        --install-dir "${DOTNET_ROOT}" \
        --no-path \
        --version "${DOTNET_VERSION}" \
    && ln -s "${DOTNET_ROOT}/dotnet" /usr/local/bin/dotnet \
    && rm -f /tmp/dotnet-install.sh /tmp/go.tar.gz /tmp/node.tar.xz

ARG YARN_VERSION=4.18.0
ARG GH_VERSION=2.100.0

ENV COREPACK_HOME=/usr/local/share/corepack

RUN mkdir -p "${COREPACK_HOME}" \
    && corepack enable \
    && corepack install --global "yarn@${YARN_VERSION}" \
    && chmod -R a+rX "${COREPACK_HOME}"

RUN case "${TARGETARCH}" in \
        amd64) GH_SHA256=e4d4bb4498e8d007abe545b6568926793ace1b6447da598294a610018cb164be ;; \
        arm64) GH_SHA256=ea4e7a581a32ccad6cc7923cb1576ac5859ba4b9a16ab22eb8f8a96e78e2e961 ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && GH_ARCHIVE="gh_${GH_VERSION}_linux_${TARGETARCH}.tar.gz" \
    && curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/${GH_ARCHIVE}" -o /tmp/gh.tar.gz \
    && echo "${GH_SHA256}  /tmp/gh.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/gh.tar.gz -C /tmp \
    && install -m 0755 "/tmp/gh_${GH_VERSION}_linux_${TARGETARCH}/bin/gh" /usr/local/bin/gh \
    && rm -rf /tmp/gh.tar.gz "/tmp/gh_${GH_VERSION}_linux_${TARGETARCH}" \
    && gh --version

# Route GitHub credentials through the gh CLI so plain git commands authenticate with the
# host-mediated token. Written system-wide, below any user configuration, because the home
# directory is resynchronized from the host on every sandbox setup.
RUN git config --system credential.https://github.com.helper '!/usr/local/bin/gh auth git-credential' \
    && git config --system credential.https://gist.github.com.helper '!/usr/local/bin/gh auth git-credential'

# Terminal evidence for pull requests: asciinema records a command, agg renders the cast to a GIF
# with a system font (Liberation Mono from fonts-liberation above is in its default family list).
# Both are static single binaries published per architecture without checksum files, so the
# digests are pinned here and must move together with the version.
ARG ASCIINEMA_VERSION=3.2.1
ARG AGG_VERSION=1.9.0

RUN case "${TARGETARCH}" in \
        amd64) RUST_ARCH=x86_64; \
            ASCIINEMA_SHA256=1b405bbda565b33c3c4718de67fedc3535580603c0694b1ff3fb04f363430a20; \
            AGG_SHA256=f111e315cd71056b116302342553dd765b7297579ed511f111d0cedb442aeda6 ;; \
        arm64) RUST_ARCH=aarch64; \
            ASCIINEMA_SHA256=b516a6d896844c0ffbc96e0a55afe4cbcc79216abde0fc64fdda4e39bee421ea; \
            AGG_SHA256=2b4be407b97e00e1c313a41d154ced8fa3d02c560c8f47a0db4950a2576444c9 ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && curl -fsSL \
        "https://github.com/asciinema/asciinema/releases/download/v${ASCIINEMA_VERSION}/asciinema-${RUST_ARCH}-unknown-linux-gnu" \
        -o /tmp/asciinema \
    && echo "${ASCIINEMA_SHA256}  /tmp/asciinema" | sha256sum -c - \
    && install -m 0755 /tmp/asciinema /usr/local/bin/asciinema \
    && curl -fsSL \
        "https://github.com/asciinema/agg/releases/download/v${AGG_VERSION}/agg-${RUST_ARCH}-unknown-linux-gnu" \
        -o /tmp/agg \
    && echo "${AGG_SHA256}  /tmp/agg" | sha256sum -c - \
    && install -m 0755 /tmp/agg /usr/local/bin/agg \
    && rm -f /tmp/asciinema /tmp/agg \
    && asciinema --version \
    && agg --version

ARG CODEX_VERSION=0.153.4
ARG CLAUDE_CODE_VERSION=2.1.266

RUN npm install --global "@openai/codex@${CODEX_VERSION}" \
    && npm install --global --allow-scripts=@anthropic-ai/claude-code \
        "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
    && usermod --login agent --home /home/agent --move-home ubuntu \
    && groupmod --new-name agent ubuntu \
    && printf 'agent ALL=(ALL) NOPASSWD:ALL\n' >/etc/sudoers.d/agent \
    && chmod 0440 /etc/sudoers.d/agent \
    && install -d -m 0755 -o agent -g agent /home/agent/.claude /home/agent/code \
    && rm -f /etc/machine-id /var/lib/dbus/machine-id \
    && touch /etc/machine-id

COPY common/workspace-init.service /etc/systemd/system/agent-workspace-init.service
COPY --chmod=0755 common/workspace-init.sh /usr/local/libexec/agent-workspace-init
COPY --chown=agent:agent --chmod=0600 common/claude-state.json /home/agent/.claude/.claude.json

RUN systemctl enable agent-workspace-init.service \
    && dotnet --version \
    && go version \
    && node --version \
    && yarn --version \
    && claude --version \
    && codex --version

ENV DISABLE_AUTOUPDATER=1
ENV GH_NO_UPDATE_NOTIFIER=1
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV DOTNET_NOLOGO=1
ENV HOME=/home/agent
ENV PATH=/home/agent/.local/bin:${PATH}

FROM base AS minimal

USER agent
WORKDIR /home/agent/code

ENTRYPOINT ["/usr/lib/systemd/systemd"]

FROM base AS full

ARG PLAYWRIGHT_CLI_VERSION=0.1.19
ARG RUST_VERSION=1.97.1

ENV CARGO_HOME=/usr/local/cargo
# Standalone scripts resolve the globally installed `playwright` package from any directory.
ENV NODE_PATH=/usr/local/lib/node_modules
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
ENV RUSTUP_HOME=/usr/local/rustup
ENV PATH=/usr/local/cargo/bin:${PATH}

# Podman's netavark backend invokes nft for rootful bridge networking and aardvark-dns for
# container-name resolution between compose services.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        aardvark-dns \
        clang \
        ffmpeg \
        iproute2 \
        lldb \
        linux-perf \
        nftables \
        podman \
        podman-compose \
        podman-docker \
        qemu-system \
        rustup \
        strace \
    && rm -rf /var/lib/apt/lists/* \
    && rustup set profile minimal \
    && rustup default "${RUST_VERSION}" \
    && rustup component add clippy rustfmt

# Playwright ties every package version to one Chromium build. The browser CLI owns the version:
# the `playwright` package is installed at exactly the version the CLI depends on, so the CLI,
# standalone scripts and the single browser under PLAYWRIGHT_BROWSERS_PATH cannot drift apart.
# The bundled skill is installed user-wide where Claude Code and Codex look for skills;
# `playwright-cli install --skills` would otherwise write it per working directory. Root-owned
# build caches under the agent home would deny the agent user its own cache directories later.
RUN npm install --global "@playwright/cli@${PLAYWRIGHT_CLI_VERSION}" \
    && PLAYWRIGHT_VERSION="$(node -p "require('${NODE_PATH}/@playwright/cli/package.json').dependencies.playwright")" \
    && test -n "${PLAYWRIGHT_VERSION}" \
    && npm install --global "playwright@${PLAYWRIGHT_VERSION}" \
    && test "$(node -p "require('playwright/package.json').version")" = "${PLAYWRIGHT_VERSION}" \
    && playwright install --with-deps chromium \
    && chmod -R a+rX "${PLAYWRIGHT_BROWSERS_PATH}" \
    && playwright --version \
    && playwright-cli --version \
    && for skills in /home/agent/.claude/skills /home/agent/.agents/skills; do \
        mkdir -p "${skills}" \
        && cp -R "${NODE_PATH}/@playwright/cli/skills/playwright-cli" "${skills}/playwright-cli"; \
    done \
    && chown -R agent:agent /home/agent/.claude /home/agent/.agents \
    && rm -rf /var/lib/apt/lists/* /home/agent/.npm /home/agent/.cache \
    && if find /home/agent ! -user agent -print -quit | grep -q .; then \
        echo "build left files under /home/agent not owned by agent" >&2; exit 1; \
    fi

COPY --chmod=0755 common/bin/video-to-gif common/bin/media-preview /usr/local/bin/

ARG FLUX_VERSION=2.9.4
ARG HELM_VERSION=3.21.1
ARG KIND_VERSION=0.32.0
ARG KUBECTL_VERSION=1.35.7

RUN case "${TARGETARCH}" in \
        amd64) PORTABLE_ARCH=amd64 ;; \
        arm64) PORTABLE_ARCH=arm64 ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && KIND_BINARY="kind-linux-${PORTABLE_ARCH}" \
    && KIND_SHA256="$(curl -fsSL \
        "https://github.com/kubernetes-sigs/kind/releases/download/v${KIND_VERSION}/${KIND_BINARY}.sha256sum" \
        | awk '{ print $1 }')" \
    && curl -fsSL \
        "https://github.com/kubernetes-sigs/kind/releases/download/v${KIND_VERSION}/${KIND_BINARY}" \
        -o /tmp/kind \
    && echo "${KIND_SHA256}  /tmp/kind" | sha256sum -c - \
    && install -m 0755 /tmp/kind /usr/local/bin/kind \
    && HELM_ARCHIVE="helm-v${HELM_VERSION}-linux-${PORTABLE_ARCH}.tar.gz" \
    && HELM_SHA256="$(curl -fsSL "https://get.helm.sh/${HELM_ARCHIVE}.sha256sum" | awk '{ print $1 }')" \
    && curl -fsSL "https://get.helm.sh/${HELM_ARCHIVE}" -o /tmp/helm.tar.gz \
    && echo "${HELM_SHA256}  /tmp/helm.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/helm.tar.gz -C /tmp \
    && install -m 0755 "/tmp/linux-${PORTABLE_ARCH}/helm" /usr/local/bin/helm \
    && FLUX_ARCHIVE="flux_${FLUX_VERSION}_linux_${PORTABLE_ARCH}.tar.gz" \
    && FLUX_SHA256="$(curl -fsSL \
        "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_checksums.txt" \
        | awk -v filename="${FLUX_ARCHIVE}" '$2 == filename { print $1 }')" \
    && test -n "${FLUX_SHA256}" \
    && curl -fsSL \
        "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/${FLUX_ARCHIVE}" \
        -o /tmp/flux.tar.gz \
    && echo "${FLUX_SHA256}  /tmp/flux.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/flux.tar.gz -C /usr/local/bin flux \
    && KUBECTL_SHA256="$(curl -fsSL \
        "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${PORTABLE_ARCH}/kubectl.sha256")" \
    && curl -fsSL \
        "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${PORTABLE_ARCH}/kubectl" \
        -o /tmp/kubectl \
    && echo "${KUBECTL_SHA256}  /tmp/kubectl" | sha256sum -c - \
    && install -m 0755 /tmp/kubectl /usr/local/bin/kubectl \
    && rm -rf /tmp/flux.tar.gz /tmp/helm.tar.gz /tmp/kind /tmp/kubectl /tmp/linux-* \
    && cargo --version \
    && podman --version \
    && podman-compose --version \
    && kind version \
    && kubectl version --client \
    && helm version --short \
    && flux --version \
    && ffmpeg -version

ENV RUSTUP_TOOLCHAIN=${RUST_VERSION}

COPY common/full-tmpfiles.conf /usr/lib/tmpfiles.d/agent-full.conf
COPY common/full-hosts-init.service /etc/systemd/system/agent-full-hosts-init.service

RUN { getent group kvm >/dev/null || groupadd --system kvm; } \
    && usermod --append --groups kvm agent \
    && systemctl enable agent-full-hosts-init.service

USER agent
WORKDIR /home/agent/code

ENTRYPOINT ["/usr/lib/systemd/systemd"]

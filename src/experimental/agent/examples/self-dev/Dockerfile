FROM ubuntu:26.04@sha256:2260313b31c8c011cd2eebe728008efac1b3982be73eb71348ea2648d2c0e09b

ARG RUST_VERSION=1.97.1

ENV CARGO_HOME=/usr/local/cargo
ENV DEBIAN_FRONTEND=noninteractive
ENV DOTNET_ROOT=/usr/local/share/dotnet
ENV RUSTUP_HOME=/usr/local/rustup
ENV PATH=/usr/local/cargo/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Podman's netavark backend invokes nft for rootful bridge networking.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        build-essential \
        ca-certificates \
        clang \
        curl \
        git \
        libicu-dev \
        iproute2 \
        jq \
        libkrb5-dev \
        lldb \
        libssl-dev \
        linux-perf \
        nftables \
        pkg-config \
        podman \
        podman-compose \
        podman-docker \
        procps \
        qemu-system \
        ripgrep \
        rustup \
        strace \
        sudo \
        systemd \
        tmux \
    && rm -rf /var/lib/apt/lists/* \
    && rustup set profile minimal \
    && rustup default "${RUST_VERSION}" \
    && rustup component add clippy rustfmt

ARG TARGETARCH
ARG DOTNET_VERSION=10.0.302
ARG DOTNET_INSTALL_SCRIPT_COMMIT=6f559c420847ded38591392dafe785ad511f39f5
ARG DOTNET_INSTALL_SCRIPT_SHA256=082f7685e156738a1b2e2ed8381a621870d4ce8e8c59278034556f05c186eb2e
ARG FLUX_VERSION=2.9.4
ARG GO_VERSION=1.26.4
ARG HELM_VERSION=3.21.1
ARG KIND_VERSION=0.32.0
ARG KUBECTL_VERSION=1.35.7
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
    && rm -rf \
        /tmp/dotnet-install.sh \
        /tmp/flux.tar.gz \
        /tmp/go.tar.gz \
        /tmp/helm.tar.gz \
        /tmp/kind \
        /tmp/kubectl \
        /tmp/linux-* \
        /tmp/node.tar.xz

ARG GH_VERSION=2.98.0
ARG YARN_VERSION=4.18.0

ENV COREPACK_HOME=/usr/local/share/corepack

RUN mkdir -p "${COREPACK_HOME}" \
    && corepack enable \
    && corepack install --global "yarn@${YARN_VERSION}" \
    && chmod -R a+rX "${COREPACK_HOME}"

RUN case "${TARGETARCH}" in \
        amd64) GH_SHA256=3b8ac6b30336802fc1a858d7c084e11cdf24ac1a761ca90b68022d7d729208de ;; \
        arm64) GH_SHA256=cf689084f3a3618f7eae4a2420d335d74626d65f5e594b9828d125d69f800d86 ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && GH_ARCHIVE="gh_${GH_VERSION}_linux_${TARGETARCH}.tar.gz" \
    && curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/${GH_ARCHIVE}" -o /tmp/gh.tar.gz \
    && echo "${GH_SHA256}  /tmp/gh.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/gh.tar.gz -C /tmp \
    && install -m 0755 "/tmp/gh_${GH_VERSION}_linux_${TARGETARCH}/bin/gh" /usr/local/bin/gh \
    && rm -rf /tmp/gh.tar.gz "/tmp/gh_${GH_VERSION}_linux_${TARGETARCH}" \
    && gh --version

ARG CODEX_VERSION=0.149.1
ARG CLAUDE_CODE_VERSION=2.1.239
ARG PLAYWRIGHT_VERSION=1.62.1

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright

RUN npm install --global "@openai/codex@${CODEX_VERSION}" \
    && npm install --global --allow-scripts=@anthropic-ai/claude-code \
        "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"

RUN npm install --global "playwright@${PLAYWRIGHT_VERSION}" \
    && playwright install --with-deps chromium \
    && chmod -R a+rX "${PLAYWRIGHT_BROWSERS_PATH}" \
    && rm -rf /var/lib/apt/lists/* \
    && playwright --version

ENV RUSTUP_TOOLCHAIN=${RUST_VERSION}

RUN { getent group kvm >/dev/null || groupadd --system kvm; } \
    && usermod --login agent --home /home/agent --move-home ubuntu \
    && groupmod --new-name agent ubuntu \
    && usermod --append --groups kvm agent \
    && printf 'agent ALL=(ALL) NOPASSWD:ALL\n' >/etc/sudoers.d/agent \
    && chmod 0440 /etc/sudoers.d/agent \
    && install -d -m 0755 -o agent -g agent /home/agent/.claude /home/agent/code \
    && rm -f /etc/machine-id /var/lib/dbus/machine-id \
    && touch /etc/machine-id

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV DOTNET_NOLOGO=1
ENV DISABLE_AUTOUPDATER=1
ENV GH_NO_UPDATE_NOTIFIER=1
ENV PATH=/home/agent/.local/bin:${PATH}

COPY workspace-init.service /etc/systemd/system/agent-workspace-init.service
COPY --chmod=0755 workspace-init.sh /usr/local/libexec/agent-workspace-init
COPY tmpfiles.conf /usr/lib/tmpfiles.d/self-dev.conf

RUN systemctl enable agent-workspace-init.service

COPY --chown=agent:agent --chmod=0600 claude-state.json /home/agent/.claude/.claude.json

ENV HOME=/home/agent

USER agent
WORKDIR /home/agent/code

ENTRYPOINT ["/usr/lib/systemd/systemd"]

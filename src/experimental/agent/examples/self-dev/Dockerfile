FROM ubuntu:26.04@sha256:2260313b31c8c011cd2eebe728008efac1b3982be73eb71348ea2648d2c0e09b

ARG RUST_VERSION=1.97.1
ARG CARGO_MACHETE_VERSION=0.9.2

ENV DEBIAN_FRONTEND=noninteractive
ENV RUSTUP_HOME=/usr/local/rustup
ENV PATH=/usr/local/cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# The toolchain the agent platform's own Rust workspace needs (libcap-ng-dev links the Microsandbox
# runtime), plus Podman so that a nested agentd can build Agent images through the Docker Engine API.
# Podman's netavark backend invokes nft for rootful bridge networking and aardvark-dns for
# container-name resolution.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        aardvark-dns \
        build-essential \
        ca-certificates \
        clang \
        curl \
        git \
        iproute2 \
        jq \
        libcap-ng-dev \
        libssl-dev \
        lldb \
        linux-perf \
        nftables \
        pkg-config \
        podman \
        podman-docker \
        procps \
        ripgrep \
        rustup \
        strace \
        sudo \
        systemd \
        tmux \
    && rm -rf /var/lib/apt/lists/* \
    && CARGO_HOME=/usr/local/cargo rustup set profile minimal \
    && CARGO_HOME=/usr/local/cargo rustup default "${RUST_VERSION}" \
    && CARGO_HOME=/usr/local/cargo rustup component add clippy rustfmt \
    && CARGO_HOME=/usr/local/cargo cargo install cargo-machete --version "${CARGO_MACHETE_VERSION}" --locked \
    && rm -rf /usr/local/cargo/registry /usr/local/cargo/git \
    && chmod -R a+rX /usr/local/cargo /usr/local/rustup

ARG TARGETARCH
ARG GH_VERSION=2.98.0
ARG NODE_VERSION=22.23.2

RUN case "${TARGETARCH}" in \
        amd64) NODE_ARCH=x64; GH_SHA256=3b8ac6b30336802fc1a858d7c084e11cdf24ac1a761ca90b68022d7d729208de ;; \
        arm64) NODE_ARCH=arm64; GH_SHA256=cf689084f3a3618f7eae4a2420d335d74626d65f5e594b9828d125d69f800d86 ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && NODE_ARCHIVE="node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    && NODE_SHA256="$(curl -fsSL "https://nodejs.org/download/release/v${NODE_VERSION}/SHASUMS256.txt" \
        | awk -v filename="${NODE_ARCHIVE}" '$2 == filename { print $1 }')" \
    && test -n "${NODE_SHA256}" \
    && curl -fsSL "https://nodejs.org/download/release/v${NODE_VERSION}/${NODE_ARCHIVE}" -o /tmp/node.tar.xz \
    && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - \
    && tar -xJf /tmp/node.tar.xz --strip-components=1 -C /usr/local \
    && GH_ARCHIVE="gh_${GH_VERSION}_linux_${TARGETARCH}.tar.gz" \
    && curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/${GH_ARCHIVE}" -o /tmp/gh.tar.gz \
    && echo "${GH_SHA256}  /tmp/gh.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/gh.tar.gz -C /tmp \
    && install -m 0755 "/tmp/gh_${GH_VERSION}_linux_${TARGETARCH}/bin/gh" /usr/local/bin/gh \
    && rm -rf /tmp/node.tar.xz /tmp/gh.tar.gz "/tmp/gh_${GH_VERSION}_linux_${TARGETARCH}" \
    && node --version \
    && gh --version

# Route GitHub credentials through the gh CLI so plain git commands authenticate with the
# host-mediated token.
RUN git config --system credential.https://github.com.helper '!/usr/local/bin/gh auth git-credential'

ARG CODEX_VERSION=0.149.1
ARG CLAUDE_CODE_VERSION=2.1.260

RUN npm install --global "@openai/codex@${CODEX_VERSION}" \
    && npm install --global --allow-scripts=@anthropic-ai/claude-code \
        "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
    && claude --version \
    && codex --version

# A nested Microsandbox runtime needs /dev/kvm; tmpfiles.conf hands the device to the kvm group.
RUN { getent group kvm >/dev/null || groupadd --system kvm; } \
    && usermod --login agent --home /home/agent --move-home ubuntu \
    && groupmod --new-name agent ubuntu \
    && usermod --append --groups kvm agent \
    && printf 'agent ALL=(ALL) NOPASSWD:ALL\n' >/etc/sudoers.d/agent \
    && chmod 0440 /etc/sudoers.d/agent \
    && install -d -m 0755 -o agent -g agent /home/agent/.claude /home/agent/code \
    && rm -f /etc/machine-id /var/lib/dbus/machine-id \
    && touch /etc/machine-id

COPY tmpfiles.conf /usr/lib/tmpfiles.d/agent-dev.conf
COPY --chown=agent:agent --chmod=0600 claude-state.json /home/agent/.claude/.claude.json

# The checkout is a bind mount shared with the host. Keep Cargo's registry and build output on the
# Sandbox root filesystem so host and Sandbox builds do not invalidate each other.
ENV CARGO_HOME=/home/agent/.cargo
ENV CARGO_TARGET_DIR=/home/agent/.cache/cargo-target
ENV RUSTUP_TOOLCHAIN=${RUST_VERSION}
# The Sandbox Image Backend speaks the Docker Engine API; point it at the Podman socket the
# platform enables and grants to the agent user.
ENV DOCKER_HOST=unix:///run/podman/podman.sock
ENV DISABLE_AUTOUPDATER=1
ENV GH_NO_UPDATE_NOTIFIER=1
ENV HOME=/home/agent
ENV PATH=/home/agent/.local/bin:/home/agent/.cargo/bin:${PATH}

USER agent
WORKDIR /home/agent/code

ENTRYPOINT ["/usr/lib/systemd/systemd"]

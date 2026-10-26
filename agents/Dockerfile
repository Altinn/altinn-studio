# The Altinn Agents' images, built on the agentctl base image. The base carries the Agent user, the
# harnesses at the versions agentctl is tested with, Node.js, gh with gh-stack, asciinema and agg,
# Neovim, shellcheck, actionlint and the common build and archive tools, and the boot settings a
# Sandbox needs, and offers the browser, containers and desktop as features:
# https://github.com/digdir/digdir-agents/tree/main/images/agentctl-base
# Renovate moves the digest, and with it the harness versions.
FROM ghcr.io/digdir/agentctl-base:ubuntu-26.04@sha256:2ee51d4619a9e13b1d1e6037b48c76fcc6bbed46ef6203aadde1270c1a2fb790 AS minimal

# The base ends as the unprivileged Agent user; installing packages needs root again.
USER root

ENV DOTNET_ROOT=/usr/local/share/dotnet
ENV PATH=/home/agent/.local/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        build-essential \
        hunspell \
        libicu-dev \
        libkrb5-dev \
        libssl-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Altinn Agents keep Norwegian local time, so timestamps they write and read match the clock the
# people reviewing their work use. The /etc/localtime symlink is the system-wide setting that
# systemd, glibc, .NET, Go and Node's ICU all resolve; an `ENV TZ` would shadow it instead and
# leave `timedatectl set-timezone` inside a running Agent without effect.
RUN ln -sf /usr/share/zoneinfo/Europe/Oslo /etc/localtime

ARG TARGETARCH
# One SDK per .NET major the repository's global.json files pin, each at the highest pin of that
# major: rollForward latestFeature never crosses a major, so an SDK 10 cannot build a project pinned
# to SDK 8 or 11. App v8 and its template are on 8, Designer and the Runtime services on 10, and App
# v9 with its libraries and test apps on 11. Move a version together with its global.json pins.
ARG DOTNET_SDK_VERSIONS="8.0.426 10.0.402 11.0.100-rc.2.26504.105"
ARG DOTNET_INSTALL_SCRIPT_COMMIT=6f559c420847ded38591392dafe785ad511f39f5
ARG DOTNET_INSTALL_SCRIPT_SHA256=082f7685e156738a1b2e2ed8381a621870d4ce8e8c59278034556f05c186eb2e
ARG GO_VERSION=1.27.3

RUN case "${TARGETARCH}" in \
        amd64) PORTABLE_ARCH=amd64; DOTNET_ARCH=x64 ;; \
        arm64) PORTABLE_ARCH=arm64; DOTNET_ARCH=arm64 ;; \
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
    && curl -fsSL \
        "https://raw.githubusercontent.com/dotnet/install-scripts/${DOTNET_INSTALL_SCRIPT_COMMIT}/src/dotnet-install.sh" \
        -o /tmp/dotnet-install.sh \
    && echo "${DOTNET_INSTALL_SCRIPT_SHA256}  /tmp/dotnet-install.sh" | sha256sum -c - \
    && for version in ${DOTNET_SDK_VERSIONS}; do \
        bash /tmp/dotnet-install.sh \
            --architecture "${DOTNET_ARCH}" \
            --install-dir "${DOTNET_ROOT}" \
            --no-path \
            --version "${version}" \
        || exit 1; \
    done \
    && ln -s "${DOTNET_ROOT}/dotnet" /usr/local/bin/dotnet \
    && install -d /etc/dotnet \
    && printf '%s\n' "${DOTNET_ROOT}" >/etc/dotnet/install_location \
    && rm -f /tmp/dotnet-install.sh /tmp/go.tar.gz

# Matches packageManager in the root package.json, so a checkout's Yarn is ready offline.
ARG YARN_VERSION=4.18.0

ENV COREPACK_HOME=/usr/local/share/corepack

# Agent Sandboxes mount their CA bundle here; this step's Node downloads trust it. The agent user
# owns COREPACK_HOME, so a checkout pinning another Yarn release installs it on first use instead
# of failing to create Corepack's cache.
RUN if [ -r /run/agent/tls/ca-bundle.pem ]; then \
      export NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem; \
    fi; \
    mkdir -p "${COREPACK_HOME}" \
    && corepack enable \
    && corepack install --global "yarn@${YARN_VERSION}" \
    && chown -R agent:agent "${COREPACK_HOME}"

# The base routes GitHub credentials through gh; Azure DevOps goes through a helper too, so plain
# git commands authenticate with the host-mediated token. Written system-wide, below any user
# configuration, because the home directory is resynchronized from the host on every sandbox setup.
# The helper emits only the inert guest placeholder; the mediated network replaces it inside Basic
# authentication.
COPY --chmod=0755 common/bin/azure-devops-git-credential /usr/local/bin/
RUN git config --system credential.https://dev.azure.com.helper '!/usr/local/bin/azure-devops-git-credential'

# uv runs the Python projects under src/AI: `uv sync` installs the Python release a project's
# .python-version names and the dependencies its uv.lock pins, so the system Python's version does
# not matter. Renovate moves it together with the Studio Assistant's CI and image.
COPY --from=ghcr.io/astral-sh/uv:0.13.0@sha256:cdc6093146eb3ff6a40107b38f008b789e050e77ad87865e381d9917da55a168 \
    /uv /uvx /usr/local/bin/

# The repository spell check (scripts/spellcheck, run by `yarn spell:*` and the pre-commit hook)
# drives typos for code and English text and hunspell for Norwegian text. The version and x86_64
# digest match .github/workflows/spellcheck.yaml and must move together with it.
ARG TYPOS_VERSION=1.51.1

RUN case "${TARGETARCH}" in \
        amd64) RUST_ARCH=x86_64; \
            TYPOS_SHA256=93c301fd4120ff076e2cc2a6d6a61cab4a4bdb81899287c0938b452e56d1f454 ;; \
        arm64) RUST_ARCH=aarch64; \
            TYPOS_SHA256=2ac5e37b3236b3c07dec5cdf1527acf143aec4674a6089b0bf424d021b35e099 ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && curl -fsSL \
        "https://github.com/crate-ci/typos/releases/download/v${TYPOS_VERSION}/typos-v${TYPOS_VERSION}-${RUST_ARCH}-unknown-linux-musl.tar.gz" \
        -o /tmp/typos.tar.gz \
    && echo "${TYPOS_SHA256}  /tmp/typos.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/typos.tar.gz -C /tmp ./typos \
    && install -m 0755 /tmp/typos /usr/local/bin/typos \
    && rm -f /tmp/typos.tar.gz /tmp/typos \
    && test "$(typos --version)" = "typos-cli ${TYPOS_VERSION}"

# golangci-lint at the version the Go modules' Makefiles pin, for the modules whose `make lint` runs it
# from PATH and for linting outside make; the Makefiles that pin it still install their own copy.
# Typst renders the augmenter-agent's PDFs, which its tests generate. Both are static binaries
# published per architecture, so the digests are pinned here and must move together with the version.
ARG GOLANGCI_LINT_VERSION=2.15.0
ARG TYPST_VERSION=0.15.1

RUN case "${TARGETARCH}" in \
        amd64) PORTABLE_ARCH=amd64; RUST_ARCH=x86_64; \
            GOLANGCI_LINT_SHA256=9b7fe6a6bf6334b98decf8d86b11415ea7889afdabdd1959fdce23af2a9ebcea; \
            TYPST_SHA256=a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c ;; \
        arm64) PORTABLE_ARCH=arm64; RUST_ARCH=aarch64; \
            GOLANGCI_LINT_SHA256=b4d8f17068b35ee6060cc2f69a16fb48740d706fbba81661c318649c114a6998; \
            TYPST_SHA256=5aa8d74a3d906e60ea12a66ac2f37f8eef1b14cbad7182a745e393a10c23dcee ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && GOLANGCI_LINT_NAME="golangci-lint-${GOLANGCI_LINT_VERSION}-linux-${PORTABLE_ARCH}" \
    && curl -fsSL \
        "https://github.com/golangci/golangci-lint/releases/download/v${GOLANGCI_LINT_VERSION}/${GOLANGCI_LINT_NAME}.tar.gz" \
        -o /tmp/golangci-lint.tar.gz \
    && echo "${GOLANGCI_LINT_SHA256}  /tmp/golangci-lint.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/golangci-lint.tar.gz -C /tmp "${GOLANGCI_LINT_NAME}/golangci-lint" \
    && install -m 0755 "/tmp/${GOLANGCI_LINT_NAME}/golangci-lint" /usr/local/bin/golangci-lint \
    && TYPST_NAME="typst-${RUST_ARCH}-unknown-linux-musl" \
    && curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/${TYPST_NAME}.tar.xz" \
        -o /tmp/typst.tar.xz \
    && echo "${TYPST_SHA256}  /tmp/typst.tar.xz" | sha256sum -c - \
    && tar -xJf /tmp/typst.tar.xz -C /tmp "${TYPST_NAME}/typst" \
    && install -m 0755 "/tmp/${TYPST_NAME}/typst" /usr/local/bin/typst \
    && rm -rf /tmp/golangci-lint.tar.gz "/tmp/${GOLANGCI_LINT_NAME}" /tmp/typst.tar.xz "/tmp/${TYPST_NAME}" \
    && scratch="$(mktemp -d)" \
    && HOME="${scratch}" golangci-lint version | grep -qF " ${GOLANGCI_LINT_VERSION} " \
    && HOME="${scratch}" typst --version | grep -qF "typst ${TYPST_VERSION} " \
    && rm -rf "${scratch}"

# Installs the .NET tools listed in dotnet-tools.json, kept in the .NET tool manifest format so
# Renovate updates it, to a shared path because the host resynchronizes the Agent's home directory.
# .NET 11 keeps its named mutexes in XDG_RUNTIME_DIR and refuses one another user owns, and the base
# sets it to the Agent user's, so root build steps that run the SDK point it at their scratch.
COPY dotnet-tools.json /tmp/dotnet-tools.json
RUN set -eu; \
    scratch="$(mktemp -d)"; \
    export HOME="${scratch}" TMPDIR="${scratch}" XDG_RUNTIME_DIR="${scratch}" \
        DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1; \
    for tool in $(jq -r '.tools | keys[]' /tmp/dotnet-tools.json); do \
        dotnet tool install "${tool}" --tool-path /usr/local/share/dotnet-tools \
            --version "$(jq -r --arg tool "${tool}" '.tools[$tool].version' /tmp/dotnet-tools.json)"; \
        for command in $(jq -r --arg tool "${tool}" '.tools[$tool].commands[]' /tmp/dotnet-tools.json); do \
            ln -s "/usr/local/share/dotnet-tools/${command}" "/usr/local/bin/${command}"; \
            "${command}" --version; \
        done; \
    done; \
    find /usr/local/share/dotnet-tools/.store -name '*.nupkg' -delete; \
    rm -rf "${scratch}" /tmp/dotnet-tools.json

ARG STUDIOCTL_VERSION=v0.1.0-preview.29
ARG STUDIOCTL_INSTALL_SCRIPT_SHA256=9a723f023a4e9625c0a5d8be262f54b25c52f563b2e8ca06fe9c5c1e1e575959

# The released installer verifies the studioctl binary and its matching resource archive against
# the release checksum file. Run it as the Agent user so self-updates and runtime state remain
# writable after the home directory is mounted and synchronized by the Agent platform. Fresh
# installations baseline legacy migrations without requiring a container runtime in minimal.
RUN install -d -m 0755 -o agent -g agent \
        /home/agent/.config \
        /home/agent/.config/altinn-studio \
        /home/agent/.local/bin \
        /home/agent/code/apps
RUN curl -fsSL \
        "https://github.com/Altinn/altinn-studio/releases/download/studioctl/${STUDIOCTL_VERSION}/install.sh" \
        -o /tmp/studioctl-install.sh \
    && echo "${STUDIOCTL_INSTALL_SCRIPT_SHA256}  /tmp/studioctl-install.sh" | sha256sum -c - \
    && sudo --user=agent env \
        HOME=/home/agent \
        PATH=/home/agent/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
        /bin/sh /tmp/studioctl-install.sh \
            --version "${STUDIOCTL_VERSION}" \
            --install-dir /home/agent/.local/bin \
    && rm -f /tmp/studioctl-install.sh \
    && test "$(/home/agent/.local/bin/studioctl version)" = "studioctl ${STUDIOCTL_VERSION}" \
    && test -x /home/agent/.config/altinn-studio/bin/studioctl-server/studioctl-server \
    && test -f /home/agent/.config/altinn-studio/data/infra/otel-collector.yaml

# The base image's workspace unit clones the repositories this list names at boot. studioctl logs in
# with the host-mediated API keys before it.
COPY common/workspace.list /etc/agent-workspace.d/altinn.list
COPY common/studioctl-auth-init.service /etc/systemd/system/agent-studioctl-auth-init.service
COPY --chmod=0755 common/studioctl-auth-init.sh /usr/local/libexec/agent-studioctl-auth-init

# The version checks run with a scratch HOME, since the toolchains write caches there and a
# root-owned one would lock the Agent out of its own.
RUN systemctl enable agent-studioctl-auth-init.service \
    && scratch="$(mktemp -d)" \
    && HOME="${scratch}" TMPDIR="${scratch}" XDG_RUNTIME_DIR="${scratch}" \
        DOTNET_SDK_VERSIONS="${DOTNET_SDK_VERSIONS}" sh -c ' \
        dotnet --list-sdks \
        && for version in ${DOTNET_SDK_VERSIONS}; do \
            dotnet --list-sdks | grep -q "^${version} " || exit 1; \
        done \
        && go version \
        && uv --version \
        && yarn --version \
        && hunspell -v' \
    && rm -rf "${scratch}" \
    && test "$(readlink /etc/localtime)" = /usr/share/zoneinfo/Europe/Oslo \
    && agent-image-check

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV DOTNET_NOLOGO=1

USER agent

# The minimal image plus containers, Kubernetes, Rust and the developer tools, a browser and a
# graphical desktop: everything LocalTest, browser evidence and computer use need.
FROM minimal AS desktop

USER root

# Chromium with playwright-cli and its skill, ffmpeg and the media helpers, and an X11 desktop with
# VNC access, the `desktop` helpers and the computer-use skill, at the versions the base pins. It
# comes first in this stage, so that updating a tool below does not reinstall the browser.
RUN agent-feature install desktop

# What `agent-feature env desktop` prints; agent-image-check fails the image without it.
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
ENV DISPLAY=:1
ENV DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
ENV ACCESSIBILITY_ENABLED=1
ENV PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/local/libexec/agent-playwright-chromium
ENV XDG_CURRENT_DESKTOP=X-Openbox:XFCE
# App frontend's Cypress runs pass `--browser "${CHROME_PATH:-chrome}"`, as the CI runner image sets
# it. Cypress does not recognize the desktop's Chrome for Testing by name, only by path.
ENV CHROME_PATH=/usr/local/libexec/agent-browser/chrome

# The repository's rust-toolchain.toml selects the toolchain inside a checkout, and Renovate moves
# this ARG together with it. The agent user owns RUSTUP_HOME, so a checkout pinned ahead of this
# image installs its toolchain on first use instead of failing.
ARG RUST_VERSION=1.97.1

# Cargo's home is the agent user's, as in the self-dev example: /usr/local/cargo is root-owned, and
# ~/.cargo lives in the Agent's home volume, so the registry cache and anything `cargo install`
# places there survive the Agent being recreated.
ENV CARGO_HOME=/home/agent/.cargo
ENV RUSTUP_HOME=/usr/local/rustup
ENV PATH=/home/agent/.local/bin:/home/agent/.cargo/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Podman, the `docker` command and Docker Compose, which agentd serves to the agent user at
# /run/docker.sock.
RUN agent-feature install containers

# `podman run --init` looks up catatonit by name. hurl runs the gitea-proxy tests; CI installs 8.0.1,
# but its release builds link a libxml2 ABI Ubuntu 26.04 no longer ships, so this is Ubuntu's build.
# libcap-ng-dev links the Microsandbox runtime, as in the self-dev example. python3-venv and pip let
# Python projects create their own virtual environments; the system interpreter stays externally
# managed. postgresql-client inspects the Postgres instances the compose stacks start, and the
# network tools debug LocalTest, studioctl and container ports.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        bind9-dnsutils \
        catatonit \
        clang \
        hurl \
        hyperfine \
        libcap-ng-dev \
        lldb \
        linux-perf \
        lsof \
        netcat-openbsd \
        postgresql-client \
        python3-pip \
        python3-venv \
        rsync \
        rustup \
        socat \
        strace \
        tcpdump \
    && rm -rf /var/lib/apt/lists/* \
    && CARGO_HOME=/usr/local/cargo rustup set profile minimal \
    && CARGO_HOME=/usr/local/cargo rustup default "${RUST_VERSION}" \
    && CARGO_HOME=/usr/local/cargo rustup component add clippy rustfmt \
    && chown -R agent:agent /usr/local/rustup

# The Rust workspace's `make deps-check` (src/ci/github-runner/coordinator) runs cargo-machete. The
# release binary is published per architecture, so the digests are pinned here; the version matches
# the CI workflows that install it and must move together with them.
ARG CARGO_MACHETE_VERSION=0.9.2

RUN case "${TARGETARCH}" in \
        amd64) CARGO_MACHETE_TARGET=x86_64-unknown-linux-musl; \
            CARGO_MACHETE_SHA256=48200087f54c55aabcd4db4af1e25742b49846c02a1b1bfa134711945b35b2e9 ;; \
        arm64) CARGO_MACHETE_TARGET=aarch64-unknown-linux-gnu; \
            CARGO_MACHETE_SHA256=6f96c3e6026a5bdd241b6ae600c6fb86c9197c6e189a894f91371baa01fd10f5 ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && CARGO_MACHETE_NAME="cargo-machete-v${CARGO_MACHETE_VERSION}-${CARGO_MACHETE_TARGET}" \
    && curl -fsSL \
        "https://github.com/bnjbvr/cargo-machete/releases/download/v${CARGO_MACHETE_VERSION}/${CARGO_MACHETE_NAME}.tar.gz" \
        -o /tmp/cargo-machete.tar.gz \
    && echo "${CARGO_MACHETE_SHA256}  /tmp/cargo-machete.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/cargo-machete.tar.gz -C /tmp "${CARGO_MACHETE_NAME}/cargo-machete" \
    && install -m 0755 "/tmp/${CARGO_MACHETE_NAME}/cargo-machete" /usr/local/bin/cargo-machete \
    && rm -rf /tmp/cargo-machete.tar.gz "/tmp/${CARGO_MACHETE_NAME}" \
    && test "$(cargo-machete --version)" = "${CARGO_MACHETE_VERSION}"

ARG FLUX_VERSION=2.9.6
ARG HELM_VERSION=3.22.1
ARG KIND_VERSION=0.33.0
ARG KUBECTL_VERSION=1.35.9

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
    && rm -rf /tmp/flux.tar.gz /tmp/helm.tar.gz /tmp/kind /tmp/kubectl /tmp/linux-*

# yq edits the manifests the deploy workflows patch, cargo-deny runs the root deny.toml that CI
# checks with cargo-deny-action, and k6 runs App frontend's `yarn k6:browser:*` scripts at the
# version of the grafana/k6 image app-frontend-k6-browser.yml runs them with. All are static binaries
# published per architecture, so the digests are pinned here and must move together with the version.
ARG CARGO_DENY_VERSION=0.20.2
ARG K6_VERSION=1.6.1
ARG YQ_VERSION=4.54.1

RUN case "${TARGETARCH}" in \
        amd64) PORTABLE_ARCH=amd64; RUST_ARCH=x86_64; \
            CARGO_DENY_SHA256=9f12ed4c49936e09b48bf862b595cde2fe64fcbd9d74dfacac6131ca824c8d5f; \
            K6_SHA256=68df4958a1b089dc6f70a234e07c7ec818922f83b261ca24f3abf79882b13343; \
            YQ_SHA256=8e34fc298390875de416e6a4afcb8cabeceb25d9aa8506c1a2f9353cf702ea5f ;; \
        arm64) PORTABLE_ARCH=arm64; RUST_ARCH=aarch64; \
            CARGO_DENY_SHA256=995c82be0defc7a025cae49a2aa2644ce8245c9a3318fc4103907c6a285e8c7d; \
            K6_SHA256=698e47804a8cf679237dc7f19813e2967e0a892d4b9387f6f6de46da259069f9; \
            YQ_SHA256=189088da0c6429ec5178dfaab1a114805f6cab0b61b165ab236efedf1d57a71b ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && CARGO_DENY_NAME="cargo-deny-${CARGO_DENY_VERSION}-${RUST_ARCH}-unknown-linux-musl" \
    && curl -fsSL \
        "https://github.com/EmbarkStudios/cargo-deny/releases/download/${CARGO_DENY_VERSION}/${CARGO_DENY_NAME}.tar.gz" \
        -o /tmp/cargo-deny.tar.gz \
    && echo "${CARGO_DENY_SHA256}  /tmp/cargo-deny.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/cargo-deny.tar.gz -C /tmp "${CARGO_DENY_NAME}/cargo-deny" \
    && install -m 0755 "/tmp/${CARGO_DENY_NAME}/cargo-deny" /usr/local/bin/cargo-deny \
    && curl -fsSL \
        "https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}/yq_linux_${PORTABLE_ARCH}" \
        -o /tmp/yq \
    && echo "${YQ_SHA256}  /tmp/yq" | sha256sum -c - \
    && install -m 0755 /tmp/yq /usr/local/bin/yq \
    && K6_NAME="k6-v${K6_VERSION}-linux-${PORTABLE_ARCH}" \
    && curl -fsSL "https://github.com/grafana/k6/releases/download/v${K6_VERSION}/${K6_NAME}.tar.gz" \
        -o /tmp/k6.tar.gz \
    && echo "${K6_SHA256}  /tmp/k6.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/k6.tar.gz -C /tmp "${K6_NAME}/k6" \
    && install -m 0755 "/tmp/${K6_NAME}/k6" /usr/local/bin/k6 \
    && rm -rf /tmp/cargo-deny.tar.gz "/tmp/${CARGO_DENY_NAME}" /tmp/yq /tmp/k6.tar.gz "/tmp/${K6_NAME}" \
    && test "$(cargo-deny --version)" = "cargo-deny ${CARGO_DENY_VERSION}" \
    && k6 version | grep -qF "v${K6_VERSION}" \
    && yq --version | grep -qF "v${YQ_VERSION}"

# agentctl and agentd run nested Agents: this image asks for nested Sandboxes and has the Podman the
# nested-build variants build their images with. Renovate moves it to new agentctl releases.
COPY --from=ghcr.io/digdir/agentctl:v0.1.0-preview.13@sha256:5451dd5e912865d7ed4544f0bf2e6d0912cd274b878515224cd05896a286b28f \
    /agentctl /agentd /usr/local/bin/

# devenv provisions kind clusters with the CA bundle this variable names: it registers the bundle in
# each node's trust store and mounts it into the Flux controllers. Without it the mediated CA is
# unknown inside the cluster and every Helm repository fetch fails certificate verification.
ENV STUDIO_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

COPY common/dev-hosts-init.service /etc/systemd/system/agent-dev-hosts-init.service
# Keep the Norwegian keyboard layout, so that people reaching the desktop type æøå and ÆØÅ.
COPY common/agent-desktop.conf /etc/agent-desktop.conf.d/altinn.conf

# Kind bind-mounts /lib/modules read-only into every node container. Podman fails the run when the
# source path is missing where Docker would create it, and the Sandbox kernel is built without
# loadable modules, so nothing else creates the directory the mount needs.
RUN install -d /lib/modules \
    && systemctl enable agent-dev-hosts-init.service \
    && scratch="$(mktemp -d)" \
    && HOME="${scratch}" TMPDIR="${scratch}" sh -c ' \
        cargo --version \
        && cargo machete --version \
        && agentctl --version \
        && agentd --version \
        && podman --version \
        && kind version \
        && kubectl version --client \
        && helm version --short \
        && flux --version \
        && python3 -m venv "${TMPDIR}/venv-check" \
        && "${TMPDIR}/venv-check/bin/pip" --version \
        && psql --version \
        && hurl --version | head -1 \
        && hyperfine --version \
        && socat -V | head -1 \
        && tcpdump --version \
        && dig -v' \
    && rm -rf "${scratch}" \
    && agent-image-check

USER agent

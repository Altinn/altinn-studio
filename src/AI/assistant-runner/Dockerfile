FROM rust:1.97.1-bookworm@sha256:0e2bcaef56d041a486784e54104a81aebe0da44bd03019bd70bc0401e42e4a97 AS build

RUN apt-get update \
    && apt-get install --yes --no-install-recommends libcap-ng-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /source
COPY Cargo.toml Cargo.lock ./
# Cargo reads every workspace member, so the build context has the Rust sources of all members.
COPY src src
RUN cargo build \
    --locked \
    --release \
    --bins \
    --package assistant-runner \
    --package sandbox-host \
    && strip --strip-unneeded \
      /source/target/release/assistant-runner \
      /source/target/release/sandbox-image

FROM ubuntu:24.04@sha256:224a1869083a311ef3f13648a154ba79832fbef6364d31493642ca03082da254 AS runtime-bundle

ARG MICROSANDBOX_RUNTIME_VERSION=0.7.4-digdir.3

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /runtime
RUN runtime_tag="v${MICROSANDBOX_RUNTIME_VERSION}" \
    && release_url="https://github.com/digdir/microsandbox/releases/download/${runtime_tag}" \
    && curl --fail --location --retry 5 --output microsandbox-linux-x86_64.tar.gz \
      "${release_url}/microsandbox-linux-x86_64.tar.gz" \
    && curl --fail --location --retry 5 --output checksums.sha256 \
      "${release_url}/checksums.sha256" \
    && sha256sum --check --ignore-missing --strict checksums.sha256 \
    && grep --fixed-strings --quiet '  microsandbox-linux-x86_64.tar.gz' checksums.sha256

# The downloaded Microsandbox runtime requires glibc 2.28 or newer.
FROM ubuntu:24.04@sha256:224a1869083a311ef3f13648a154ba79832fbef6364d31493642ca03082da254

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates libcap-ng0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build \
  /source/target/release/assistant-runner \
  /usr/local/bin/assistant-runner
COPY --from=build \
  /source/target/release/sandbox-image \
  /usr/local/bin/sandbox-image
COPY --from=runtime-bundle \
  /runtime/microsandbox-linux-x86_64.tar.gz \
  /runtime/checksums.sha256 \
  /opt/altinn/microsandbox/

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/assistant-runner"]

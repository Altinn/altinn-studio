FROM --platform=$BUILDPLATFORM golang:1.27.3-trixie@sha256:fbb7ae40b62ff8afe31662df570d39b4f5052ac32b90dae8e60d7657a20a74f4 AS builder
ARG TARGETOS
ARG TARGETARCH

# The build context is src/: the proxy builds against the shared Go module in common/go, which its
# go.mod replaces with that directory. Dockerfile.dockerignore keeps the context to the two modules.
WORKDIR /src/Runtime/platform-proxy

COPY common/go/go.mod common/go/go.sum /src/common/go/
COPY Runtime/platform-proxy/go.mod Runtime/platform-proxy/go.sum ./

RUN go mod download

COPY common/go/ /src/common/go/
COPY Runtime/platform-proxy/ ./

# The commit the image is built from, reported as service.version. "dev" in local builds.
ARG SERVICE_VERSION=dev
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -ldflags "-X altinn.studio/platform-proxy/internal/telemetry.serviceVersion=${SERVICE_VERSION}" \
    -o /app/platform-proxy ./cmd/platform-proxy

FROM scratch

WORKDIR /app

COPY --from=builder /app/platform-proxy .

EXPOSE 5040

COPY --from=builder /etc/passwd /etc/passwd
# The proxy verifies the platform's certificate against these, scratch has none
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
USER nobody

ENTRYPOINT ["./platform-proxy"]

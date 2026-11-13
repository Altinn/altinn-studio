# Build the manager binary
FROM --platform=$BUILDPLATFORM golang:1.27.3-trixie@sha256:fbb7ae40b62ff8afe31662df570d39b4f5052ac32b90dae8e60d7657a20a74f4 AS builder
ARG TARGETOS
ARG TARGETARCH

# The build context is src/: the operator builds against the shared Go module in common/go, which
# its go.mod replaces with that directory. <Dockerfile>.dockerignore keeps the context to the two
# modules.
WORKDIR /src/core/operator
COPY common/go/go.mod common/go/go.sum /src/common/go/
COPY core/operator/go.mod core/operator/go.sum ./

# Download the dependencies before the source is copied, so a source change reuses this layer.
RUN go mod download

COPY common/go/ /src/common/go/
COPY core/operator/ ./

# The commit the image is built from, reported as service.version. "dev" in local builds.
ARG SERVICE_VERSION=dev

# GOARCH has no default, so the binary is built for the platform the image is built for.
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build \
    -ldflags "-X altinn.studio/core-operator/internal/telemetry.serviceVersion=${SERVICE_VERSION}" \
    -o /workspace/manager ./cmd

# Use distroless as minimal base image to package the manager binary
# Refer to https://github.com/GoogleContainerTools/distroless for more details
FROM gcr.io/distroless/static:nonroot@sha256:d62067879de890a1def9da0e7766b7d20810a5e5555cef8506b752437d7a3e88
WORKDIR /
COPY --from=builder /workspace/manager .
USER 65532:65532

ENTRYPOINT ["/manager"]

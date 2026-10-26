FROM --platform=$BUILDPLATFORM docker.io/library/golang:1.27.3-trixie@sha256:fbb7ae40b62ff8afe31662df570d39b4f5052ac32b90dae8e60d7657a20a74f4 AS builder
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

COPY go.mod go.sum ./
RUN go mod download

COPY . ./
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /sandbox-node ./cmd/sandbox-node

FROM scratch

COPY --from=builder /sandbox-node /sandbox-node

USER 0:0
ENTRYPOINT ["/sandbox-node"]

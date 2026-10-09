FROM --platform=$BUILDPLATFORM docker.io/library/golang:1.27.0-trixie@sha256:df98008ecd2b0ecc9f0a94d1b07e3564a9c92b555369b33d9b5f60d0765b2db7 AS builder
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

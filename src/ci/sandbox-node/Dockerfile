FROM --platform=$BUILDPLATFORM docker.io/library/golang:1.26.6-trixie@sha256:b75d466dd608587fd66cca705a307ba65b889827d06ad61d6a75f0482b51b7c7 AS builder
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

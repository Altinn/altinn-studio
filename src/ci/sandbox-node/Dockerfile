FROM --platform=$BUILDPLATFORM docker.io/library/golang:1.27.2-trixie@sha256:47667934874913a449b96faa7ef4777fa285d9ec29126ee80ed61c45b7cccf0e AS builder
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

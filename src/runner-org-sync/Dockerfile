# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

ARG GO_VERSION=1.26

# --- build ------------------------------------------------------------------
FROM golang:${GO_VERSION}-alpine AS build

WORKDIR /src

RUN apk add --no-cache ca-certificates

# Module cache: download deps first so source changes don't re-download.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Static binary so we can run on distroless/static without a libc.
# -trimpath strips local paths from stack traces, -s -w trims symbol tables.
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build \
        -trimpath \
        -ldflags="-s -w" \
        -o /out/runner-org-sync \
        ./cmd/runner-org-sync

# --- runtime ----------------------------------------------------------------
# Scratch is enough for the static Go binary. Copy the CA bundle explicitly
# because the service talks to Azure KV, the CDN, Kubernetes, and OTLP over TLS.
FROM scratch

COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /out/runner-org-sync /runner-org-sync

USER 65532:65532
ENTRYPOINT ["/runner-org-sync"]

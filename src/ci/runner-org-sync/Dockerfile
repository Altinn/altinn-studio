# syntax=docker/dockerfile:1.29@sha256:572cebbc2b15e6f84c077742952674889cb63cd5e9b80abdffcbe587b6f19183

# --- build ------------------------------------------------------------------
FROM golang:1.27.3-alpine@sha256:b8c9b82affbbb82a020bbcf998dad2ba9516944ac7e883524642a481a9505e9c AS build

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

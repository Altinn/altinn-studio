# syntax=docker/dockerfile:1.7

ARG GO_VERSION=1.26

# --- build ------------------------------------------------------------------
FROM golang:${GO_VERSION}-alpine AS build

WORKDIR /src

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
# Distroless static (nonroot variant): no shell, no package manager, runs as
# uid 65532. ca-certificates are bundled, so TLS to Azure KV and the CDN
# works without extra setup.
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/runner-org-sync /runner-org-sync

USER 65532:65532
ENTRYPOINT ["/runner-org-sync"]

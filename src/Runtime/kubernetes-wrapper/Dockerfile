FROM --platform=$BUILDPLATFORM golang:1.26.0-trixie@sha256:889885d7cc1275935e3f9920aabadc5fadbe873f633d92a746f1bc401dd40f69 AS builder
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . ./

RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -a -o main ./cmd/main.go

FROM scratch

WORKDIR /app

COPY --from=builder /app/main ./
COPY --from=builder /etc/passwd /etc/passwd

USER nobody

EXPOSE 8080

ENTRYPOINT ["./main"]

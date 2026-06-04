SHELL := /bin/bash
BINARY := bin/runner-org-sync
PKG    := ./...

.PHONY: build
build:
	@mkdir -p bin
	go build -trimpath -ldflags="-s -w" -o $(BINARY) ./cmd/runner-org-sync

.PHONY: test
test:
	go test -race -count=1 $(PKG)

.PHONY: test-cover
test-cover:
	go test -race -count=1 -coverprofile=coverage.out $(PKG)
	go tool cover -html=coverage.out -o coverage.html

.PHONY: lint
lint:
	golangci-lint run

.PHONY: tidy
tidy:
	go mod tidy

.PHONY: vet
vet:
	go vet $(PKG)

.PHONY: clean
clean:
	rm -rf bin coverage.out coverage.html

.PHONY: help build test test-e2e test-verbose test-coverage test-race clean tidy fmt lint check
.PHONY: run stop golangci-lint
.DEFAULT_GOAL := help

CACHE_DIR := .cache

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build all packages
	@echo "Building packages..."
	@go build ./...
	@echo "✓ Build successful"

clean: ## Clean build artifacts and test cache
	@echo "Cleaning..."
	@go clean -cache -testcache -modcache
	@rm -f coverage.out
	@echo "✓ Cleaned"

tidy: ## Tidy go modules
	@echo "Tidying go modules..."
	@go mod tidy
	@echo "✓ Modules tidied"

fmt: golangci-lint ## Format Go code
	@echo "Formatting code..."
	@"$(GOLANGCI_LINT)" fmt
	@echo "✓ Code formatted"

lint: golangci-lint ## Run linters with auto-fix
	@echo "Running linters..."
	@"$(GOLANGCI_LINT)" run --fix

test: ## Run all tests
	@echo "Running tests..."
	@go test -count=1 ./...
	@echo "✓ All tests passed"

test-e2e: ## Run e2e tests (none in this module)
	@echo "No dedicated e2e tests for this module."

test-verbose: ## Run all tests with verbose output
	@echo "Running tests with verbose output..."
	@go test -v -count=1 ./...

test-coverage: ## Run tests with coverage report
	@echo "Running tests with coverage..."
	@go test -cover -coverprofile=coverage.out ./...
	@echo ""
	@echo "Coverage by package:"
	@go tool cover -func=coverage.out
	@echo ""
	@echo "To view HTML coverage report, run: go tool cover -html=coverage.out"

test-race: ## Run tests with race detector
	@echo "Running tests with race detector..."
	@go test -race -count=1 ./...
	@echo "✓ No race conditions detected"

check: tidy fmt lint test ## Run fmt, lint, and test
	@echo ""
	@echo "✓ All checks passed"

run: ## Run the standard variant of the container runtime fixture
	@go run ./cmd/fixture --action run --variant standard --cache-dir $(CACHE_DIR)

stop: ## Stop the standard variant of the container runtime fixture
	@go run ./cmd/fixture --action stop --variant standard --cache-dir $(CACHE_DIR)

##@ Dependencies

LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p "$(LOCALBIN)"

GOLANGCI_LINT = $(LOCALBIN)/golangci-lint
GOLANGCI_LINT_VERSION ?= v2.6.2

.PHONY: golangci-lint
golangci-lint: $(GOLANGCI_LINT) ## Download golangci-lint locally if necessary.
$(GOLANGCI_LINT): $(LOCALBIN)
	$(call go-install-tool,$(GOLANGCI_LINT),github.com/golangci/golangci-lint/v2/cmd/golangci-lint,$(GOLANGCI_LINT_VERSION))

# go-install-tool will 'go install' any package with custom target and name of binary, if it doesn't exist
# $1 - target path with name of binary
# $2 - package url which can be installed
# $3 - specific version of package
define go-install-tool
@[ -f "$(1)-$(3)" ] && [ "$$(readlink -- "$(1)" 2>/dev/null)" = "$(1)-$(3)" ] || { \
set -e; \
package=$(2)@$(3) ;\
echo "Downloading $${package}" ;\
rm -f "$(1)" ;\
GOBIN="$(LOCALBIN)" go install $${package} ;\
mv "$(LOCALBIN)/$$(basename "$(1)")" "$(1)-$(3)" ;\
} ;\
ln -sf "$$(realpath "$(1)-$(3)")" "$(1)"
endef

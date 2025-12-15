.PHONY: help format lint build-local test test-e2e test-e2e-simple test-e2e-smoke test-loop logs loadtest start start-minimal start-standard start-minimal-monitoring start-standard-monitoring stop golangci-lint
.DEFAULT_GOAL := help

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

test: ## Run unit tests
	@echo "Running unit tests..."
	@go test ./internal/... ./cmd/...
	@echo "✓ Unit tests passed"

test-e2e: ## Run all e2e tests (simple first, then smoke)
	@go run ./cmd/tester test --keep-running

test-e2e-smoke: ## Run e2e smoke tests only
	@go run ./cmd/tester test --smoke --keep-running

test-e2e-simple: ## Run e2e simple tests only
	@go run ./cmd/tester test --simple --keep-running

check: tidy fmt lint test ## Run fmt, lint, and test
	@echo ""
	@echo "✓ All checks passed"

test-loop: ## Run tests n times (use 'make test-loop n=10' to run 10 times)
ifndef n
	$(error n parameter is required. Usage: make test-loop n=10)
endif
	@go run ./cmd/tester test --n $(n)

start: start-minimal ## Start the Kind cluster (alias for start-minimal)

start-minimal: ## Start with minimal variant
	@go run ./cmd/tester start minimal

start-standard: ## Start with standard variant
	@go run ./cmd/tester start standard

start-minimal-monitoring: ## Start minimal with Prometheus/Grafana
	@go run ./cmd/tester start minimal --monitoring

start-standard-monitoring: ## Start standard with Prometheus/Grafana
	@go run ./cmd/tester start standard --monitoring

stop: ## Stop the runtime fixture/cluster
	@go run ./cmd/tester stop

logs: ## Stream logs from pdf3 components
	stern -l component=pdf3 -n runtime-pdf3 -E linkerd-init -E linkerd-proxy --tail -1

loadtest-local: ## Run k6 load tests against local cluster (test-local.ts)
	@go run ./cmd/tester loadtest-local --keep-running

loadtest-env: ## Run k6 browser tests against remote environment (test-env.js)
	@go run ./cmd/tester loadtest-env

browser:
	mkdir -p .cache/
	cd .cache/ && npx @puppeteer/browsers install chrome-headless-shell@stable

##@ Dependencies

LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p "$(LOCALBIN)"

GOLANGCI_LINT = $(LOCALBIN)/golangci-lint
GOLANGCI_LINT_VERSION ?= v2.5.0

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

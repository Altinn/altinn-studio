.PHONY: help start start-minimal start-standard stop test test-e2e build restore lint lint-fix fmt clean tidy
.DEFAULT_GOAL := help

CACHE_DIR := .cache
LOCALBIN := bin

# Tools
GOLANGCI_LINT_VERSION ?= v2.8.0
GOLANGCI_LINT := $(LOCALBIN)/golangci-lint

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

start: start-minimal ## Start the Kind cluster (alias for start-minimal)

start-minimal: ## Start with minimal variant
	@go run ./cmd/tester start minimal

start-standard: ## Start with standard variant
	@go run ./cmd/tester start standard

stop: ## Stop the runtime fixture/cluster
	@go run ./cmd/tester stop

test: ## Run unit tests
	@echo "No unit tests yet"

test-e2e: ## Run e2e tests (starts cluster if needed, keeps running)
	@go run ./cmd/tester test

restore: ## Restore .NET packages and tools
	@echo "Restoring .NET packages..."
	@dotnet restore StudioGateway.slnx
	@echo "Restoring .NET tools..."
	@dotnet tool restore
	@echo "✓ Restore complete"

build: ## Build Go and .NET projects
	@echo "Building Go packages..."
	@go build ./...
	@echo "Building .NET solution..."
	@dotnet build StudioGateway.slnx
	@echo "✓ Build successful"

lint: golangci-lint ## Run linters (Roslyn + golangci-lint)
	@echo "Linting .NET (Roslyn analyzers)..."
	@DOTNET_TREATWARNINGSASERRORS=true dotnet build StudioGateway.slnx
	@echo "Linting Go..."
	@"$(abspath $(GOLANGCI_LINT))" run
	@echo "✓ Lint passed"

lint-fix: golangci-lint ## Run linters with auto-fix (Go only)
	@"$(abspath $(GOLANGCI_LINT))" run --fix

fmt: golangci-lint ## Format code (CSharpier + golangci-lint)
	@echo "Formatting .NET (CSharpier)..."
	@dotnet csharpier format .
	@echo "Formatting Go..."
	@"$(abspath $(GOLANGCI_LINT))" fmt
	@echo "✓ Formatted"

tidy: ## Tidy go modules
	@echo "Tidying go modules..."
	@go mod tidy
	@echo "✓ Modules tidied"

clean: ## Clean build artifacts and cache
	@echo "Cleaning..."
	@rm -rf $(CACHE_DIR)/checksums
	@go clean -cache -testcache
	@echo "✓ Cleaned"

##@ Tool Dependencies

$(LOCALBIN):
	mkdir -p $(LOCALBIN)

.PHONY: golangci-lint
golangci-lint: $(GOLANGCI_LINT) ## Download golangci-lint locally if necessary
$(GOLANGCI_LINT): $(LOCALBIN)
	$(call go-install-tool,$(GOLANGCI_LINT),github.com/golangci/golangci-lint/v2/cmd/golangci-lint,$(GOLANGCI_LINT_VERSION))

# go-install-tool will 'go install' any package with custom target and target name.
# if the target binary exists and has the expected version, skip installation.
define go-install-tool
@[ -f "$(1)-$(3)" ] && [ -L "$(1)" ] && [ "$$(readlink $(1))" = "$$(basename $(1)-$(3))" ] || { \
	set -e; \
	package=$(2)@$(3); \
	echo "Installing $${package}"; \
	rm -f $(1) $(1)-*; \
	GOBIN=$(abspath $(LOCALBIN)) go install $${package}; \
	mv $(1) $(1)-$(3); \
	ln -sf $$(basename $(1)-$(3)) $(1); \
}
endef

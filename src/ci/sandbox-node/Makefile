.PHONY: help build clean tidy fmt lint lint-fix lint-config test check golangci-lint
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build all packages
	@go build ./...

clean: ## Clean build artifacts and test cache
	@go clean -cache -testcache
	@rm -f coverage.out

tidy: ## Tidy Go modules
	@go mod tidy

fmt: golangci-lint ## Format Go code
	@"$(GOLANGCI_LINT)" fmt

lint: golangci-lint ## Run static analysis
	@"$(GOLANGCI_LINT)" run ./...

lint-fix: golangci-lint ## Run static analysis with automatic fixes
	@"$(GOLANGCI_LINT)" run --fix ./...

lint-config: golangci-lint ## Verify linter configuration
	@"$(GOLANGCI_LINT)" config verify

test: ## Run unit and lifecycle tests
	@go test -race -coverprofile=coverage.out ./...

check: tidy fmt lint test build ## Run all CI checks
	@echo "✓ All checks passed"

LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p "$(LOCALBIN)"

GOLANGCI_LINT = $(LOCALBIN)/golangci-lint
GOLANGCI_LINT_VERSION ?= v2.11.2

golangci-lint: $(GOLANGCI_LINT) ## Download golangci-lint locally if necessary
$(GOLANGCI_LINT): $(LOCALBIN)
	$(call go-install-tool,$(GOLANGCI_LINT),github.com/golangci/golangci-lint/v2/cmd/golangci-lint,$(GOLANGCI_LINT_VERSION))

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

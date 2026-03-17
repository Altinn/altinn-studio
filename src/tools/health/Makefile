.PHONY: help build test fmt lint lint-fix lint-config golangci-lint
.DEFAULT_GOAL := help

LOCALBIN := bin

# Match `go install` output on Windows so tool install rules can locate binaries.
EXEEXT :=
ifeq ($(OS),Windows_NT)
EXEEXT := .exe
endif

GOLANGCI_LINT_VERSION ?= v2.11.2
GOLANGCI_LINT := $(LOCALBIN)/golangci-lint$(EXEEXT)

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'
	@echo ''
	@echo 'CLI usage:'
	@go run cmd/main.go help

build: ## Build all packages
	@echo "Building packages..."
	@go build ./...
	@echo "✓ Build successful"

fmt: golangci-lint ## Format code
	@"$(abspath $(GOLANGCI_LINT))" fmt

lint: golangci-lint ## Run linter
	@"$(abspath $(GOLANGCI_LINT))" run ./...

lint-fix: golangci-lint ## Run linter with auto-fix
	@"$(abspath $(GOLANGCI_LINT))" run --fix ./...

lint-config: golangci-lint ## Verify linter configuration
	@"$(abspath $(GOLANGCI_LINT))" config verify

test: ## Run tests
	@echo "Running tests with coverage..."
	@go test -count=1 -coverprofile=coverage.out -covermode=count ./... || true
	@if [ -f coverage.out ]; then \
		go tool cover -html=coverage.out -o coverage.html; \
		go tool cover -func=coverage.out | tail -1; \
		echo "✓ Coverage report generated: coverage.html"; \
	else \
		echo "✗ No coverage data generated"; \
	fi

$(LOCALBIN):
	mkdir -p $(LOCALBIN)

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

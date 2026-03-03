# studioctl Makefile

# Build settings
VERSION ?= 0.1.0-preview.0
LDFLAGS := -ldflags "-X altinn.studio/studioctl/internal/cmd.version=$(VERSION)"

# Directories
BUILD_DIR := build
DEV_HOME := $(BUILD_DIR)/dev-home
LOCALBIN := bin

# Match `go install` output on Windows so tool install rules can locate binaries.
EXEEXT :=
ifeq ($(OS),Windows_NT)
EXEEXT := .exe
endif

# Tools
GOLANGCI_LINT_VERSION ?= v2.8.0
GOLANGCI_LINT := $(LOCALBIN)/golangci-lint$(EXEEXT)

.PHONY: all
all: build

##@ Development

.PHONY: build
build: ## Build studioctl binary
	go build $(LDFLAGS) -o $(BUILD_DIR)/studioctl ./cmd/studioctl

.PHONY: test
test: ## Run unit tests
	go test -race -count=1 ./...

.PHONY: test-e2e
test-e2e: ## Run e2e tests
	@echo "No e2e tests yet"

.PHONY: test-cover
test-cover: ## Run tests with coverage
	go test -race -coverprofile=$(BUILD_DIR)/coverage.out ./...
	go tool cover -html=$(BUILD_DIR)/coverage.out -o $(BUILD_DIR)/coverage.html

.PHONY: lint
lint: golangci-lint ## Run linter
	"$(abspath $(GOLANGCI_LINT))" run

.PHONY: lint-fix
lint-fix: golangci-lint ## Run linter with auto-fix
	"$(abspath $(GOLANGCI_LINT))" run --fix

.PHONY: lint-config
lint-config: golangci-lint ## Verify linter configuration
	"$(abspath $(GOLANGCI_LINT))" config verify

.PHONY: fmt
fmt: golangci-lint ## Format code
	"$(abspath $(GOLANGCI_LINT))" fmt

.PHONY: tidy
tidy: ## Tidy go.mod
	go mod tidy

##@ Development Helpers (Cross-Platform via cmd/dev)

.PHONY: resources
resources: ## Build localtest resources tarball (cross-platform)
	go run ./cmd/dev resources

.PHONY: dev-install
dev-install: ## Install to isolated dev home directory (cross-platform)
	go run ./cmd/dev install

.PHONY: user-install
user-install: ## Install to user directories (cross-platform)
	go run ./cmd/dev install -user

.PHONY: dev-run
dev-run: dev-install ## Run studioctl with dev config (use CMD="env up" etc)
	STUDIOCTL_HOME=$(abspath $(DEV_HOME)) $(DEV_HOME)/bin/studioctl $(CMD)

.PHONY: clean
clean: ## Clean build artifacts (cross-platform)
	go run ./cmd/dev clean

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

##@ Help

.PHONY: help
help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

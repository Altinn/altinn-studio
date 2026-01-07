# studioctl Makefile

# Build settings
VERSION ?= 0.0.1-preview.0
LDFLAGS := -ldflags "-X altinn.studio/studioctl/internal/cmd.version=$(VERSION)"

# Directories
STUDIOCTL_DIR := studioctl
BUILD_DIR := build
DEV_HOME := $(BUILD_DIR)/dev-home
LOCALBIN := $(STUDIOCTL_DIR)/bin

# Source paths for localtest resources
LOCALTEST_DIR := ../Runtime/localtest
RESOURCES_TARBALL := $(BUILD_DIR)/localtest-resources.tar.gz

# Tools
GOLANGCI_LINT_VERSION ?= v2.8.0
GOLANGCI_LINT := $(LOCALBIN)/golangci-lint

.PHONY: all
all: build

##@ Development

.PHONY: build
build: ## Build studioctl binary
	cd $(STUDIOCTL_DIR) && go build $(LDFLAGS) -o ../$(BUILD_DIR)/studioctl ./cmd/studioctl

.PHONY: test
test: ## Run unit tests
	cd $(STUDIOCTL_DIR) && go test -race -count=1 ./...

.PHONY: test-cover
test-cover: ## Run tests with coverage
	cd $(STUDIOCTL_DIR) && go test -race -coverprofile=../$(BUILD_DIR)/coverage.out ./...
	cd $(STUDIOCTL_DIR) && go tool cover -html=../$(BUILD_DIR)/coverage.out -o ../$(BUILD_DIR)/coverage.html

.PHONY: lint
lint: golangci-lint ## Run linter
	cd $(STUDIOCTL_DIR) && "$(abspath $(GOLANGCI_LINT))" run

.PHONY: lint-fix
lint-fix: golangci-lint ## Run linter with auto-fix
	cd $(STUDIOCTL_DIR) && "$(abspath $(GOLANGCI_LINT))" run --fix

.PHONY: lint-config
lint-config: golangci-lint ## Verify linter configuration
	cd $(STUDIOCTL_DIR) && "$(abspath $(GOLANGCI_LINT))" config verify

.PHONY: fmt
fmt: golangci-lint ## Format code
	cd $(STUDIOCTL_DIR) && "$(abspath $(GOLANGCI_LINT))" fmt

.PHONY: tidy
tidy: ## Tidy go.mod
	cd $(STUDIOCTL_DIR) && go mod tidy

##@ Development Helpers

.PHONY: resources
resources: $(RESOURCES_TARBALL) ## Build localtest resources tarball

$(RESOURCES_TARBALL): $(shell find $(LOCALTEST_DIR)/testdata $(LOCALTEST_DIR)/infra -type f 2>/dev/null)
	@mkdir -p $(BUILD_DIR)
	tar -czf $(RESOURCES_TARBALL) -C $(LOCALTEST_DIR) testdata infra

.PHONY: dev-install
dev-install: build resources ## Install to isolated dev home directory
	mkdir -p $(DEV_HOME)/bin
	cp $(BUILD_DIR)/studioctl $(DEV_HOME)/bin/
	@echo "Running studioctl install with local tarball..."
	STUDIOCTL_HOME=$(abspath $(DEV_HOME)) \
		STUDIOCTL_RESOURCES_TARBALL=$(abspath $(RESOURCES_TARBALL)) \
		$(DEV_HOME)/bin/studioctl install --force

.PHONY: user-install
user-install: build resources ## Install to user directories (~/.local/bin, ~/.altinn-studio)
	mkdir -p ~/.local/bin
	cp $(BUILD_DIR)/studioctl ~/.local/bin/studioctl
	@echo "Running studioctl install with local tarball..."
	STUDIOCTL_RESOURCES_TARBALL=$(abspath $(RESOURCES_TARBALL)) \
		~/.local/bin/studioctl install --force

.PHONY: dev-run
dev-run: dev-install ## Run studioctl with dev config (use CMD="env up" etc)
	STUDIOCTL_HOME=$(abspath $(DEV_HOME)) $(DEV_HOME)/bin/studioctl $(CMD)

.PHONY: clean
clean: ## Clean build artifacts
	rm -rf $(BUILD_DIR)
	rm -rf $(LOCALBIN)

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

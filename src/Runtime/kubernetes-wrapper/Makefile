.PHONY: help build fmt lint lint-config test check setup-envtest envtest golangci-lint clean
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build kubernetes-wrapper binary
	go build ./...

fmt: golangci-lint ## Format Go code
	"$(GOLANGCI_LINT)" fmt

lint: golangci-lint ## Run golangci-lint
	"$(GOLANGCI_LINT)" run

lint-config: golangci-lint ## Verify golangci-lint configuration
	"$(GOLANGCI_LINT)" config verify

check: fmt lint test ## Run all checks

# Update snapshots automatically outside CI unless overridden
UPDATE_SNAPS ?= true
ifeq ($(CI),true)
UPDATE_SNAPS := false
endif

.PHONY: test
test: setup-envtest ## Run tests with envtest
	@assets="$$("$(ENVTEST)" use $(ENVTEST_K8S_VERSION) --bin-dir "$(LOCALBIN)" -p path)"; \
	KUBEBUILDER_ASSETS="$$assets" UPDATE_SNAPS=$(UPDATE_SNAPS) go test ./...

clean: ## Clean go test/build caches
	go clean -cache -testcache

##@ Dependencies

LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p "$(LOCALBIN)"

ENVTEST ?= $(LOCALBIN)/setup-envtest
GOLANGCI_LINT ?= $(LOCALBIN)/golangci-lint
# Keep aligned with controller-runtime major.minor
ENVTEST_VERSION ?= release-0.22
ENVTEST_K8S_VERSION ?= 1.35
GOLANGCI_LINT_VERSION ?= v2.5.0

.PHONY: setup-envtest
setup-envtest: envtest ## Download envtest binaries for configured k8s version
	@"$(ENVTEST)" use $(ENVTEST_K8S_VERSION) --bin-dir "$(LOCALBIN)" -p path >/dev/null

.PHONY: envtest
envtest: $(ENVTEST) ## Download setup-envtest tool if needed

$(ENVTEST): $(LOCALBIN)
	$(call go-install-tool,$(ENVTEST),sigs.k8s.io/controller-runtime/tools/setup-envtest,$(ENVTEST_VERSION))

.PHONY: golangci-lint
golangci-lint: $(GOLANGCI_LINT) ## Download golangci-lint locally if necessary

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

.PHONY: help format lint build-local test test-loop logs loadtest run stop
.DEFAULT_GOAL := help

CACHE_DIR := .cache
BIN_DIR := .cache/bin

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

setup: ## Install required development tools
	@go run ../test/fixture/cmd/setup --cache $(CACHE_DIR) --tools golangci-lint

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

fmt: setup ## Format Go code
	@echo "Formatting code..."
	@$(BIN_DIR)/golangci-lint fmt
	@echo "✓ Code formatted"

lint: setup ## Run linters with auto-fix
	@echo "Running linters..."
	@$(BIN_DIR)/golangci-lint run --fix

test: ## Run all tests (simple first, then smoke)
	@go run ./cmd/tester test --keep-running

test-smoke: ## Run smoke tests only
	@go run ./cmd/tester test --smoke --keep-running

test-simple: ## Run simple tests only
	@go run ./cmd/tester test --simple --keep-running

check: tidy fmt lint test ## Run fmt, lint, and test
	@echo ""
	@echo "✓ All checks passed"

test-loop: ## Run tests n times (use 'make test-loop n=10' to run 10 times)
ifndef n
	$(error n parameter is required. Usage: make test-loop n=10)
endif
	@go run ./cmd/tester test --n $(n)

run: ## Start the runtime fixture/cluster
ifndef v
	$(error v parameter is required. Usage: make run v=minimal|standard)
endif
	@go run ./cmd/tester start $(v)

stop: ## Stop the runtime fixture/cluster
	@go run ./cmd/tester stop

logs: ## Stream logs from pdf3 components
	stern -l component=pdf3 -n runtime-pdf3 -E linkerd-init -E linkerd-proxy --tail -1

loadtest: ## Run k6 load tests
	@go run ./cmd/tester loadtest


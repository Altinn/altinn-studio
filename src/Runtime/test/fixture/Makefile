.PHONY: help setup build test test-verbose test-coverage test-race clean tidy fmt lint check
.PHONY: run stop
.DEFAULT_GOAL := help

CACHE_DIR := .cache
BIN_DIR := .cache/bin

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

setup: ## Install required development tools
	@go run ./cmd/setup --cache $(CACHE_DIR) --tools golangci-lint,kubectl

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

test: ## Run all tests
	@echo "Running tests..."
	@go test -count=1 ./...
	@echo "✓ All tests passed"

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

netshoot: setup ## Runs the nicolaka/netshoot container as interactive shell (for debugging purposes)
	@$(BIN_DIR)/kubectl run tmp-shell --rm -i --tty --image nicolaka/netshoot

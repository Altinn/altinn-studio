.PHONY: help start start-minimal start-standard stop test build clean tidy
.DEFAULT_GOAL := help

CACHE_DIR := .cache

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

test: ## Run integration tests (starts cluster if needed, keeps running)
	@go run ./cmd/tester test

build: ## Build Go and .NET projects
	@echo "Building Go packages..."
	@go build ./...
	@echo "Building .NET solution..."
	@dotnet build StudioGateway.slnx
	@echo "✓ Build successful"

tidy: ## Tidy go modules
	@echo "Tidying go modules..."
	@go mod tidy
	@echo "✓ Modules tidied"

clean: ## Clean build artifacts and cache
	@echo "Cleaning..."
	@rm -rf $(CACHE_DIR)/checksums
	@go clean -cache -testcache
	@echo "✓ Cleaned"

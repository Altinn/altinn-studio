.PHONY: help run stop test build clean tidy
.DEFAULT_GOAL := help

CACHE_DIR := .cache

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

run: ## Start the runtime fixture/cluster (usage: make run v=minimal|standard)
ifndef v
	$(error v parameter is required. Usage: make run v=minimal|standard)
endif
	@go run ./cmd/tester start $(v)

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

.PHONY: help build test
.DEFAULT_GOAL := help

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

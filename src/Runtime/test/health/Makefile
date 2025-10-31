.PHONY: help build
.DEFAULT_GOAL := help

CACHE_DIR := .cache
BIN_DIR := .cache/bin

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

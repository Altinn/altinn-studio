.PHONY: help build clean fmt lint lint-fix test deps deps-check check
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

build: ## Build the crate and the sandbox-image binary
	@echo "Building sandbox-hosting..."
	@cargo build -p sandbox-hosting --all-targets --locked
	@echo "✓ Build successful"

clean: ## Clean sandbox-hosting build artifacts
	@echo "Cleaning sandbox-hosting build artifacts..."
	@cargo clean -p sandbox-hosting
	@echo "✓ Cleaned"

fmt: ## Format Rust code
	@echo "Formatting sandbox-hosting..."
	@cargo fmt -p sandbox-hosting
	@echo "✓ Code formatted"

lint: ## Run strict Clippy analysis
	@echo "Linting sandbox-hosting..."
	@cargo clippy -p sandbox-hosting --all-targets --all-features --locked
	@echo "✓ Lint passed"

lint-fix: ## Apply safe Clippy fixes
	@echo "Applying Clippy fixes to sandbox-hosting..."
	@cargo clippy -p sandbox-hosting --all-targets --all-features --fix --allow-dirty --locked
	@echo "✓ Lint fixes applied"

test: ## Run all tests
	@echo "Testing sandbox-hosting..."
	@cargo test -p sandbox-hosting --all-targets --locked
	@echo "✓ Tests passed"

deps: ## Print the sandbox-hosting dependency graph
	@cargo tree -p sandbox-hosting --locked

deps-check: ## Check for unused direct dependencies
	@cargo machete --with-metadata .
	@git diff --exit-code -- ':(top)Cargo.lock'

check: fmt build lint test deps-check ## Run all local checks
	@echo "✓ All checks passed"

.PHONY: help build clean fmt lint lint-fix test deps deps-check check
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

build: ## Build the operator runner
	@echo "Building operator runner..."
	@cargo build -p operator-runner --all-targets --locked
	@echo "✓ Build successful"

clean: ## Clean the build artifacts
	@echo "Cleaning operator runner build artifacts..."
	@cargo clean -p operator-runner
	@echo "✓ Cleaned"

fmt: ## Format Rust code
	@echo "Formatting operator runner..."
	@cargo fmt -p operator-runner
	@echo "✓ Code formatted"

lint: ## Run strict Clippy analysis
	@echo "Linting operator runner..."
	@cargo clippy -p operator-runner --all-targets --all-features --locked
	@echo "✓ Lint passed"

lint-fix: ## Apply safe Clippy fixes
	@echo "Applying Clippy fixes to operator runner..."
	@cargo clippy -p operator-runner --all-targets --all-features --fix --allow-dirty --locked
	@echo "✓ Lint fixes applied"

test: ## Run all tests
	@echo "Testing operator runner..."
	@cargo test -p operator-runner --all-targets --locked
	@echo "✓ Tests passed"

deps: ## Print the dependency graph
	@cargo tree -p operator-runner --locked

deps-check: ## Check for unused direct dependencies
	@cargo machete --with-metadata .
	@git diff --exit-code -- ':(top)Cargo.lock'

check: fmt build lint test deps-check ## Run all local checks
	@echo "✓ All checks passed"

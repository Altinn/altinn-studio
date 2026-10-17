.PHONY: help build clean fmt lint lint-fix test deps deps-check check
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

build: ## Build the assistant runner
	@echo "Building assistant runner..."
	@cargo build -p assistant-runner -p sandbox-host --all-targets --locked
	@echo "✓ Build successful"

clean: ## Clean the build artifacts
	@echo "Cleaning assistant runner build artifacts..."
	@cargo clean -p assistant-runner
	@echo "✓ Cleaned"

fmt: ## Format Rust code
	@echo "Formatting assistant runner..."
	@cargo fmt -p assistant-runner -p sandbox-host
	@echo "✓ Code formatted"

lint: ## Run strict Clippy analysis
	@echo "Linting assistant runner..."
	@cargo clippy -p assistant-runner -p sandbox-host --all-targets --all-features --locked
	@echo "✓ Lint passed"

lint-fix: ## Apply safe Clippy fixes
	@echo "Applying Clippy fixes to assistant runner..."
	@cargo clippy -p assistant-runner -p sandbox-host --all-targets --all-features --fix --allow-dirty --locked
	@echo "✓ Lint fixes applied"

test: ## Run all tests
	@echo "Testing assistant runner..."
	@cargo test -p assistant-runner -p sandbox-host --all-targets --locked
	@echo "✓ Tests passed"

deps: ## Print the dependency graph
	@cargo tree -p assistant-runner --locked

deps-check: ## Check for unused direct dependencies
	@cargo machete --with-metadata .
	@git diff --exit-code -- ':(top)Cargo.lock'

check: fmt build lint test deps-check ## Run all local checks
	@echo "✓ All checks passed"

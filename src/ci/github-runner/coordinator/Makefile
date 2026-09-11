.PHONY: help build clean fmt lint lint-fix test deps deps-check check
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

build: ## Build the coordinator
	@echo "Building GitHub runner coordinator..."
	@cargo build -p github-runner-coordinator --all-targets --locked
	@echo "✓ Build successful"

clean: ## Clean coordinator build artifacts
	@echo "Cleaning GitHub runner coordinator build artifacts..."
	@cargo clean -p github-runner-coordinator
	@echo "✓ Cleaned"

fmt: ## Format Rust code
	@echo "Formatting GitHub runner coordinator..."
	@cargo fmt -p github-runner-coordinator
	@echo "✓ Code formatted"

lint: ## Run strict Clippy analysis
	@echo "Linting GitHub runner coordinator..."
	@cargo clippy -p github-runner-coordinator --all-targets --all-features --locked
	@echo "✓ Lint passed"

lint-fix: ## Apply safe Clippy fixes
	@echo "Applying Clippy fixes to GitHub runner coordinator..."
	@cargo clippy -p github-runner-coordinator --all-targets --all-features --fix --allow-dirty --locked
	@echo "✓ Lint fixes applied"

test: ## Run all tests
	@echo "Testing GitHub runner coordinator..."
	@cargo test -p github-runner-coordinator --all-targets --locked
	@echo "✓ Tests passed"

deps: ## Print the coordinator dependency graph
	@cargo tree -p github-runner-coordinator --locked

deps-check: ## Check for unused direct dependencies
	@cargo machete --with-metadata .
	@git diff --exit-code -- ':(top)Cargo.lock'

check: fmt build lint test deps-check ## Run all local checks
	@echo "✓ All checks passed"

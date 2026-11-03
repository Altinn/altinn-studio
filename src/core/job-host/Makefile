.PHONY: help build clean fmt lint lint-fix test deps deps-check check
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

build: ## Build the job host
	@echo "Building job host..."
	@cargo build -p job-host --all-targets --locked
	@echo "✓ Build successful"

clean: ## Clean the build artifacts
	@echo "Cleaning job host build artifacts..."
	@cargo clean -p job-host
	@echo "✓ Cleaned"

fmt: ## Format Rust code
	@echo "Formatting job host..."
	@cargo fmt -p job-host
	@echo "✓ Code formatted"

lint: ## Run strict Clippy analysis
	@echo "Linting job host..."
	@cargo clippy -p job-host --all-targets --all-features --locked
	@echo "✓ Lint passed"

lint-fix: ## Apply safe Clippy fixes
	@echo "Applying Clippy fixes to job host..."
	@cargo clippy -p job-host --all-targets --all-features --fix --allow-dirty --locked
	@echo "✓ Lint fixes applied"

test: ## Run all tests
	@echo "Testing job host..."
	@cargo test -p job-host --all-targets --locked
	@echo "✓ Tests passed"

deps: ## Print the dependency graph
	@cargo tree -p job-host --locked

deps-check: ## Check for unused direct dependencies and the Microsandbox runtime pin
	@cargo machete --with-metadata .
	@git diff --exit-code -- ':(top)Cargo.lock'
	@../../ci/sandbox-host/check-runtime-pin.sh Dockerfile

check: fmt build lint test deps-check ## Run all local checks
	@echo "✓ All checks passed"

.PHONY: help fmt fmt-check lint test deps-check check
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

fmt: ## Format Rust code
	cargo fmt -p github-runner-coordinator

fmt-check: ## Verify Rust formatting
	cargo fmt -p github-runner-coordinator --check

lint: ## Run strict Clippy analysis
	cargo clippy -p github-runner-coordinator --all-targets --all-features --locked

test: ## Run all tests
	cargo test -p github-runner-coordinator --all-targets --locked

deps-check: ## Check for unused direct dependencies
	cargo machete --with-metadata .

check: fmt-check lint test deps-check ## Run the complete local verification sequence

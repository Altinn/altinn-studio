.PHONY: help build fmt fmt-check lint lint-fix test test-independent test-microsandbox check check-ci check-platforms deps deps-check
.DEFAULT_GOAL := help

EXPERIMENTAL_PACKAGES := \
	-p agent-runtime \
	-p agent-runtime-protocol \
	-p agent \
	-p sandbox-authorization \
	-p sandbox \
	-p sandbox-self-dev \
	-p sandbox-microsandbox
PORTABLE_PACKAGES := -p sandbox -p sandbox-authorization -p agent-runtime-protocol -p agent-runtime -p agent

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

build: ## Build all experimental Rust crates
	cargo build $(EXPERIMENTAL_PACKAGES) --all-targets

fmt: ## Format Rust code
	cargo fmt $(EXPERIMENTAL_PACKAGES)

fmt-check: ## Verify Rust formatting
	cargo fmt $(EXPERIMENTAL_PACKAGES) --check

lint: ## Run strict Clippy analysis
	cargo clippy $(EXPERIMENTAL_PACKAGES) --all-targets --all-features

lint-fix: ## Apply safe Clippy fixes
	cargo clippy $(EXPERIMENTAL_PACKAGES) --all-targets --all-features --fix --allow-dirty

test: ## Run all tests
	cargo test $(EXPERIMENTAL_PACKAGES) --all-targets

test-independent: ## Test reusable lower-layer crates independently
	cargo test --manifest-path sandbox/Cargo.toml --all-targets
	cargo test --manifest-path sandbox-microsandbox/Cargo.toml --all-targets
	cargo test --manifest-path sandbox-authorization/Cargo.toml --all-targets
	cargo test --manifest-path agent-runtime-protocol/Cargo.toml --all-targets
	cargo test --manifest-path agent-runtime/Cargo.toml --all-targets

test-microsandbox: ## Run the real Docker/Microsandbox integration tests
	cargo test -p sandbox-microsandbox --tests -- --ignored

deps: ## Print the workspace dependency graph
	cargo tree $(EXPERIMENTAL_PACKAGES)

deps-check: ## Check for unused direct dependencies
	cargo machete --with-metadata .

check: fmt-check lint build test test-independent test-microsandbox deps-check ## Run the complete local verification sequence

check-ci: fmt-check lint build test test-independent deps-check ## Run checks that do not require KVM

check-platforms: ## Cross-check portable Windows and macOS code (requires rustup targets)
	cargo clippy $(PORTABLE_PACKAGES) --all-targets --all-features --target x86_64-pc-windows-gnu
	cargo clippy $(PORTABLE_PACKAGES) --all-targets --all-features --target aarch64-apple-darwin
	cargo clippy $(PORTABLE_PACKAGES) --all-targets --all-features --target x86_64-apple-darwin

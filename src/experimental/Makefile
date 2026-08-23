.PHONY: help build user-install clean fmt lint lint-fix test test-e2e check check-platforms deps deps-check
.DEFAULT_GOAL := help

USER_INSTALL_VERSION := v0.0.0
USER_INSTALL_ARCHIVE := $(abspath build/user-install/agent-$(USER_INSTALL_VERSION).tar.gz)
RELEASE_BIN_DIR := $(abspath ../../target/release)

EXPERIMENTAL_PACKAGES := \
	-p agent \
	-p sandbox-authorization \
	-p sandbox \
	-p sandbox-self-dev \
	-p sandbox-microsandbox
PORTABLE_PACKAGES := \
	-p sandbox \
	-p sandbox-authorization \
	-p agent \
	-p sandbox-microsandbox

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

build: ## Build all experimental Rust crates
	@echo "Building experimental Rust crates..."
	@cargo build $(EXPERIMENTAL_PACKAGES) --all-targets --locked
	@echo "✓ Build successful"

user-install: ## Build, package and install agentctl and agentd for the current user
	@echo "Building experimental Agent $(USER_INSTALL_VERSION)..."
	@AGENT_VERSION=$(USER_INSTALL_VERSION) cargo build --release --locked -p agent --bins
	@./agent/package.sh "$(USER_INSTALL_ARCHIVE)" "$(RELEASE_BIN_DIR)"
ifeq ($(OS),Windows_NT)
	@AGENT_VERSION=$(USER_INSTALL_VERSION) AGENT_LOCAL_ARCHIVE="$(USER_INSTALL_ARCHIVE)" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(abspath agent/install.ps1)"
else
	@AGENT_VERSION=$(USER_INSTALL_VERSION) AGENT_LOCAL_ARCHIVE="$(USER_INSTALL_ARCHIVE)" ./agent/install.sh
endif

clean: ## Clean experimental build artifacts
	@echo "Cleaning experimental build artifacts..."
	@cargo clean $(EXPERIMENTAL_PACKAGES)
	@echo "✓ Cleaned"

fmt: ## Format Rust code
	@echo "Formatting experimental Rust code..."
	@cargo fmt $(EXPERIMENTAL_PACKAGES)
	@echo "✓ Code formatted"

lint: ## Run strict Clippy analysis
	@echo "Linting experimental Rust crates..."
	@cargo clippy $(EXPERIMENTAL_PACKAGES) --all-targets --all-features --locked
	@echo "✓ Lint passed"

lint-fix: ## Apply safe Clippy fixes
	@echo "Applying Clippy fixes to experimental Rust crates..."
	@cargo clippy $(EXPERIMENTAL_PACKAGES) --all-targets --all-features --fix --allow-dirty --locked
	@echo "✓ Lint fixes applied"

test: ## Run all tests
	@echo "Testing experimental Rust crates..."
	@cargo test $(EXPERIMENTAL_PACKAGES) --all-targets --locked
	@echo "✓ Tests passed"

test-e2e: ## Run integration tests that require Docker, Internet access, and KVM
	@echo "Running experimental end-to-end tests..."
	@cargo test -p sandbox-microsandbox --tests --locked -- --ignored
	@echo "✓ End-to-end tests passed"

deps: ## Print the workspace dependency graph
	@cargo tree $(EXPERIMENTAL_PACKAGES) --locked

deps-check: ## Check for unused direct dependencies
	@cargo machete --with-metadata .
	@git diff --exit-code -- ':(top)Cargo.lock'

check: fmt lint build test test-e2e deps-check ## Run all local checks
	@echo "✓ All checks passed"

check-platforms: ## Check portable code on the current native host (CI covers every supported host)
	@cargo clippy $(PORTABLE_PACKAGES) --all-targets --all-features --locked

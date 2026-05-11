.PHONY: help run start dev run-deps stop reset db-reset test
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+( [a-zA-Z_-]+)*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {gsub(/ /, " | ", $$1); printf "  %-20s %s\n", $$1, $$2}'

run start: run-deps ## Run the workflow-engine app locally
	dotnet run --project src/WorkflowEngine.App

dev run-deps: ## Start localtest dependencies for local engine development
	studioctl env up --dev-workflow-engine

stop: ## Stop localtest dependencies
	studioctl env down

reset db-reset: ## Stop localtest dependencies and delete persisted localtest data
	studioctl env reset

test: ## Run all tests
	dotnet test

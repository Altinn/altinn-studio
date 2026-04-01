.PHONY: help run start dev run-deps stop reset db-reset test
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+( [a-zA-Z_-]+)*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {gsub(/ /, " | ", $$1); printf "  %-20s %s\n", $$1, $$2}'

run start: ## Run full stack (engine + dependencies) in Docker
	docker compose --profile core up -d --build

dev run-deps: ## Start dependencies only (for local engine development)
	docker compose up -d

stop: ## Stop all services
	docker compose --profile core down

reset db-reset: ## Stop all services and delete the database volume
	docker compose --profile core down
	docker volume rm workflow-engine_postgres_data 2>/dev/null || true

test: ## Run all tests
	dotnet test

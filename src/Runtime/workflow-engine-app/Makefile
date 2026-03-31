.PHONY: help run dev run-deps stop reset db-reset test
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

run: ## Run full stack (engine + dependencies) in Docker
	docker compose --profile app up -d --build

dev: run-deps ## Start dependencies only (for local engine development)
run-deps:
	docker compose up -d

stop: ## Stop all services
	docker compose --profile app down

reset: db-reset ## Stop all services and delete the database volume
db-reset:
	docker compose --profile app down
	docker volume rm workflow-engine-app_postgres_data 2>/dev/null || true

test: ## Run all tests
	dotnet test

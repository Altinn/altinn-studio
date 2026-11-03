.PHONY: help run start dev run-deps stop reset db-reset test
.DEFAULT_GOAL := help

POSTGRES_CONTAINER := operator-workflow-engine-postgres

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+( [a-zA-Z_-]+)*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {gsub(/ /, " | ", $$1); printf "  %-20s %s\n", $$1, $$2}'

run start: run-deps ## Run the host locally against a local PostgreSQL
	dotnet run --project src/WorkflowEngine.Operator

dev run-deps: ## Start a local PostgreSQL on port 9544
	docker start $(POSTGRES_CONTAINER) 2>/dev/null || docker run -d --name $(POSTGRES_CONTAINER) \
		-e POSTGRES_DB=workflow_engine -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
		-p 9544:5432 postgres:18

stop: ## Stop the local PostgreSQL
	docker stop $(POSTGRES_CONTAINER) 2>/dev/null || true

reset db-reset: ## Stop and delete the local PostgreSQL and its data
	docker rm -f -v $(POSTGRES_CONTAINER) 2>/dev/null || true

test: ## Run all tests
	dotnet test

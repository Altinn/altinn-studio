# Altinn Studio Makefile
# Make targets for syncing subtree repositories

# Configuration
LOCALTEST_PREFIX = src/Runtime/localtest
FRONTEND_PREFIX = src/App/frontend
BACKEND_PREFIX = src/App/backend

# Remote repository paths (relative to this repo's directory)
LOCALTEST_REPO = ../app-localtest
FRONTEND_REPO = ../app-frontend-react
BACKEND_REPO = ../app-lib-dotnet

# Expected GitHub remotes
LOCALTEST_REMOTE = Altinn/app-localtest
FRONTEND_REMOTE = Altinn/app-frontend-react
BACKEND_REMOTE = Altinn/app-lib-dotnet

# Default branch
DEFAULT_BRANCH = main

.PHONY: sync-localtest sync-app-frontend sync-app-backend check-branch help

help: ## Show this help message
	@echo "Available targets:"
	@echo "  sync-localtest  - Sync localtest subtree from ../app-localtest"
	@echo "  sync-app-frontend   - Sync frontend subtree from ../app-frontend-react"
	@echo "  sync-app-backend    - Sync backend subtree from ../app-lib-dotnet"
	@echo "  check-branch    - Check if current branch follows naming convention"
	@echo "  help           - Show this help message"

check-branch: ## Check if current branch follows chore/subtree-sync-* naming convention
	@current_branch=$$(git branch --show-current); \
	if [[ $$current_branch != chore/subtree-sync-* ]]; then \
		echo "ERROR: Current branch '$$current_branch' should follow pattern 'chore/subtree-sync-*' when syncing subtrees"; \
		exit 1; \
	fi; \
	echo "✓ Branch name '$$current_branch' follows expected pattern"

sync-localtest: check-branch ## Sync localtest subtree
	@echo "Syncing localtest subtree..."
	@if [ ! -d "$(LOCALTEST_REPO)" ]; then \
		echo "ERROR: Source directory $(LOCALTEST_REPO) does not exist"; \
		exit 1; \
	fi
	@cd $(LOCALTEST_REPO) && \
		current_remote=$$(git remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||' | sed 's|\.git$$||') && \
		if [ "$$current_remote" != "$(LOCALTEST_REMOTE)" ]; then \
			echo "ERROR: $(LOCALTEST_REPO) remote is $$current_remote, expected $(LOCALTEST_REMOTE)"; \
			exit 1; \
		fi && \
		echo "✓ Remote verification passed: $$current_remote" && \
		current_branch=$$(git branch --show-current) && \
		if [ "$$current_branch" != "$(DEFAULT_BRANCH)" ]; then \
			echo "ERROR: $(LOCALTEST_REPO) is on branch $$current_branch, expected $(DEFAULT_BRANCH)"; \
			echo "Please checkout $(DEFAULT_BRANCH) and pull latest changes manually"; \
			exit 1; \
		fi && \
		git fetch origin && \
		local_commit=$$(git rev-parse HEAD) && \
		remote_commit=$$(git rev-parse origin/$(DEFAULT_BRANCH)) && \
		if [ "$$local_commit" != "$$remote_commit" ]; then \
			echo "ERROR: $(LOCALTEST_REPO) is not up to date with origin/$(DEFAULT_BRANCH)"; \
			echo "Please pull latest changes manually"; \
			exit 1; \
		fi && \
		echo "✓ $(LOCALTEST_REPO) is up to date with origin/$(DEFAULT_BRANCH)"
	git subtree pull --prefix=$(LOCALTEST_PREFIX) $(LOCALTEST_REPO) $(DEFAULT_BRANCH)
	@echo "✓ Localtest subtree sync complete"

sync-app-frontend: check-branch ## Sync frontend subtree
	@echo "Syncing frontend subtree..."
	@if [ ! -d "$(FRONTEND_REPO)" ]; then \
		echo "ERROR: Source directory $(FRONTEND_REPO) does not exist"; \
		exit 1; \
	fi
	@cd $(FRONTEND_REPO) && \
		current_remote=$$(git remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||' | sed 's|\.git$$||') && \
		if [ "$$current_remote" != "$(FRONTEND_REMOTE)" ]; then \
			echo "ERROR: $(FRONTEND_REPO) remote is $$current_remote, expected $(FRONTEND_REMOTE)"; \
			exit 1; \
		fi && \
		echo "✓ Remote verification passed: $$current_remote" && \
		current_branch=$$(git branch --show-current) && \
		if [ "$$current_branch" != "$(DEFAULT_BRANCH)" ]; then \
			echo "ERROR: $(FRONTEND_REPO) is on branch $$current_branch, expected $(DEFAULT_BRANCH)"; \
			echo "Please checkout $(DEFAULT_BRANCH) and pull latest changes manually"; \
			exit 1; \
		fi && \
		git fetch origin && \
		local_commit=$$(git rev-parse HEAD) && \
		remote_commit=$$(git rev-parse origin/$(DEFAULT_BRANCH)) && \
		if [ "$$local_commit" != "$$remote_commit" ]; then \
			echo "ERROR: $(FRONTEND_REPO) is not up to date with origin/$(DEFAULT_BRANCH)"; \
			echo "Please pull latest changes manually"; \
			exit 1; \
		fi && \
		echo "✓ $(FRONTEND_REPO) is up to date with origin/$(DEFAULT_BRANCH)"
	git subtree pull --prefix=$(FRONTEND_PREFIX) $(FRONTEND_REPO) $(DEFAULT_BRANCH)
	@echo "✓ Frontend subtree sync complete"

sync-app-backend: check-branch ## Sync backend subtree
	@echo "Syncing backend subtree..."
	@if [ ! -d "$(BACKEND_REPO)" ]; then \
		echo "ERROR: Source directory $(BACKEND_REPO) does not exist"; \
		exit 1; \
	fi
	@cd $(BACKEND_REPO) && \
		current_remote=$$(git remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||' | sed 's|\.git$$||') && \
		if [ "$$current_remote" != "$(BACKEND_REMOTE)" ]; then \
			echo "ERROR: $(BACKEND_REPO) remote is $$current_remote, expected $(BACKEND_REMOTE)"; \
			exit 1; \
		fi && \
		echo "✓ Remote verification passed: $$current_remote" && \
		current_branch=$$(git branch --show-current) && \
		if [ "$$current_branch" != "$(DEFAULT_BRANCH)" ]; then \
			echo "ERROR: $(BACKEND_REPO) is on branch $$current_branch, expected $(DEFAULT_BRANCH)"; \
			echo "Please checkout $(DEFAULT_BRANCH) and pull latest changes manually"; \
			exit 1; \
		fi && \
		git fetch origin && \
		local_commit=$$(git rev-parse HEAD) && \
		remote_commit=$$(git rev-parse origin/$(DEFAULT_BRANCH)) && \
		if [ "$$local_commit" != "$$remote_commit" ]; then \
			echo "ERROR: $(BACKEND_REPO) is not up to date with origin/$(DEFAULT_BRANCH)"; \
			echo "Please pull latest changes manually"; \
			exit 1; \
		fi && \
		echo "✓ $(BACKEND_REPO) is up to date with origin/$(DEFAULT_BRANCH)"
	git subtree pull --prefix=$(BACKEND_PREFIX) $(BACKEND_REPO) $(DEFAULT_BRANCH)
	@echo "✓ Backend subtree sync complete"

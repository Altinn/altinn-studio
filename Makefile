# Altinn Studio Makefile
# Make targets for syncing subtree repositories

# Configuration: name:prefix:repo:remote
SUBTREES := localtest:src/Runtime/localtest:../app-localtest:Altinn/app-localtest \
           frontend:src/App/frontend:../app-frontend-react:Altinn/app-frontend-react \
           backend:src/App/backend:../app-lib-dotnet:Altinn/app-lib-dotnet \
           fileanalyzers:src/App/fileanalyzers:../fileanalyzers-lib-dotnet:Altinn/fileanalyzers-lib-dotnet \
           codelists:src/App/codelists:../codelists-lib-dotnet:Altinn/codelists-lib-dotnet

# Default branch
DEFAULT_BRANCH = main

# Extract target names for .PHONY
SUBTREE_TARGETS := $(foreach subtree,$(SUBTREES),sync-$(word 1,$(subst :, ,$(subtree))))

.PHONY: $(SUBTREE_TARGETS) check-branch help

help: ## Show this help message
	@echo "Available targets:"
	@$(foreach subtree,$(SUBTREES), \
		echo "  sync-$(word 1,$(subst :, ,$(subtree))) - Sync $(word 1,$(subst :, ,$(subtree))) subtree from $(word 3,$(subst :, ,$(subtree)))";)
	@echo "  check-branch - Check if current branch follows naming convention"
	@echo "  help - Show this help message"

check-branch: ## Check if current branch follows chore/subtree-sync-* naming convention
	@current_branch=$$(git rev-parse --abbrev-ref HEAD); \
	case "$$current_branch" in \
		chore/subtree-sync-*) \
			echo "OK: Branch name '$$current_branch' follows expected pattern" ;; \
		*) \
			echo "ERROR: Current branch '$$current_branch' should follow pattern 'chore/subtree-sync-*' when syncing subtrees"; \
			exit 1 ;; \
	esac

# Function to perform sync validation and execution
# Usage: $(call sync-subtree,name,prefix,repo,remote)
define sync-subtree
	@echo "Syncing $(1) subtree..."
	@if [ ! -d "$(3)" ]; then \
		echo "ERROR: Source directory $(3) does not exist"; \
		exit 1; \
	fi
	@cd $(3) && \
		current_remote=$$(git remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||' | sed 's|\.git$$||') && \
		if [ "$$current_remote" != "$(4)" ]; then \
			echo "ERROR: $(3) remote is $$current_remote, expected $(4)"; \
			exit 1; \
		fi && \
		echo "OK: Remote verification passed: $$current_remote" && \
		current_branch=$$(git rev-parse --abbrev-ref HEAD) && \
		if [ "$$current_branch" != "$(DEFAULT_BRANCH)" ]; then \
			echo "ERROR: $(3) is on branch $$current_branch, expected $(DEFAULT_BRANCH)"; \
			echo "Please checkout $(DEFAULT_BRANCH) and pull latest changes manually"; \
			exit 1; \
		fi && \
		git fetch origin && \
		local_commit=$$(git rev-parse HEAD) && \
		remote_commit=$$(git rev-parse origin/$(DEFAULT_BRANCH)) && \
		if [ "$$local_commit" != "$$remote_commit" ]; then \
			echo "ERROR: $(3) is not up to date with origin/$(DEFAULT_BRANCH)"; \
			echo "Please pull latest changes manually"; \
			exit 1; \
		fi && \
		echo "OK: $(3) is up to date with origin/$(DEFAULT_BRANCH)"
	git subtree pull --prefix=$(2) $(3) $(DEFAULT_BRANCH)
	@echo "OK: $(1) subtree sync complete"
endef

# Generate sync targets dynamically
$(foreach subtree,$(SUBTREES), \
	$(eval sync-$(word 1,$(subst :, ,$(subtree))): check-branch ## Sync $(word 1,$(subst :, ,$(subtree))) subtree) \
	$(eval sync-$(word 1,$(subst :, ,$(subtree))): ; $$(call sync-subtree,$(word 1,$(subst :, ,$(subtree))),$(word 2,$(subst :, ,$(subtree))),$(word 3,$(subst :, ,$(subtree))),$(word 4,$(subst :, ,$(subtree))))))

# Altinn Studio Makefile
# Make targets for syncing subtree repositories

# Configuration: name:prefix:repo:remote
SUBTREES := localtest:src/Runtime/localtest:../app-localtest:Altinn/app-localtest \
           frontend:src/App/frontend:../app-frontend-react:Altinn/app-frontend-react \
           backend:src/App/backend:../app-lib-dotnet:Altinn/app-lib-dotnet \
           fileanalyzers:src/App/fileanalyzers:../fileanalyzers-lib-dotnet:Altinn/fileanalyzers-lib-dotnet \
           codelists:src/App/codelists:../codelists-lib-dotnet:Altinn/codelists-lib-dotnet

# Test apps configuration for subtree syncing (these all live in src/test/apps)
# Format: app-name:repo-url:branch
TEST_APPS := anonymous-stateless-app:https://dev.altinn.studio/repos/ttd/anonymous-stateless-app.git:master \
            component-library:https://altinn.studio/repos/ttd/component-library.git:master \
            expression-validation-test:https://dev.altinn.studio/repos/ttd/expression-validation-test.git:master \
            frontend-test:https://dev.altinn.studio/repos/ttd/frontend-test.git:master \
            multiple-datamodels-test:https://dev.altinn.studio/repos/ttd/multiple-datamodels-test.git:master \
            navigation-test-subform:https://dev.altinn.studio/repos/ttd/navigation-test-subform.git:master \
            payment-test:https://dev.altinn.studio/repos/ttd/payment-test.git:master \
            service-task:https://altinn.studio/repos/ttd/service-task.git:master \
            signering-brukerstyrt:https://altinn.studio/repos/ttd/signering-brukerstyrt.git:master \
            signing-test:https://dev.altinn.studio/repos/ttd/signing-test.git:master \
            stateless-app:https://dev.altinn.studio/repos/ttd/stateless-app.git:master \
            subform-test:https://dev.altinn.studio/repos/ttd/subform-test.git:master

# Default branch
DEFAULT_BRANCH = main

# Extract target names for .PHONY
SUBTREE_TARGETS := $(foreach subtree,$(SUBTREES),sync-$(word 1,$(subst :, ,$(subtree))))

.PHONY: $(SUBTREE_TARGETS) help create-pr sync-test-apps

help: ## Show this help message
	@echo "Available targets:"
	@$(foreach subtree,$(SUBTREES), \
		echo "  sync-$(word 1,$(subst :, ,$(subtree))) - Sync $(word 1,$(subst :, ,$(subtree))) subtree from $(word 3,$(subst :, ,$(subtree)))";)
	@echo "  sync-test-apps - Sync all test app subtrees in src/test/apps"
	@echo "  help - Show this help message"

create-pr: ## Push changes and create pull request for sync job
	@current_branch=$$(git rev-parse --abbrev-ref HEAD); \
	subtree_name=$$(echo $$current_branch | sed 's/chore\/subtree-sync-//'); \
	if [ -n "$(SUBTREE_NAME)" ]; then \
		subtree_name="$(SUBTREE_NAME)"; \
	fi; \
	if command -v gh >/dev/null 2>&1; then \
		echo "Pushing changes to remote..."; \
		git push -u origin $$current_branch && \
		echo "Creating pull request..." && \
		gh pr create --title "chore: syncing $$subtree_name" --body "@coderabbitai ignore" --base $(DEFAULT_BRANCH) --head $$current_branch || \
		echo "WARNING: Failed to create PR. You may need to create it manually."; \
	else \
		echo "WARNING: gh command not found. Skipping automatic PR creation."; \
		echo "Install GitHub CLI to enable automatic PR creation: https://cli.github.com/"; \
	fi

# Function to perform sync validation and execution
# Usage: $(call sync-subtree,name,prefix,repo,remote)
define sync-subtree
	@echo "Syncing $(1) subtree..."
	@current_branch=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$current_branch" != "$(DEFAULT_BRANCH)" ]; then \
		echo "ERROR: You must be on the $(DEFAULT_BRANCH) branch to start a sync"; \
		echo "Current branch: $$current_branch"; \
		echo "Please checkout $(DEFAULT_BRANCH) first: git checkout $(DEFAULT_BRANCH)"; \
		exit 1; \
	fi
	@branch_name="chore/subtree-sync-$(1)"; \
	if git show-ref --verify --quiet refs/heads/$$branch_name; then \
		echo "ERROR: Branch $$branch_name already exists"; \
		echo "Please merge/close that PR and delete your remote and local branch before attempting another sync"; \
		exit 1; \
	fi; \
	echo "Creating branch $$branch_name..."; \
	git checkout -b $$branch_name
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
	@set -e; \
	if git subtree pull --prefix=$(2) $(3) $(DEFAULT_BRANCH); then \
		echo "OK: $(1) subtree sync complete"; \
		$(MAKE) create-pr SUBTREE_NAME=$(1); \
	else \
		echo ""; \
		echo "==============================================="; \
		echo "Merge conflicts detected!"; \
		echo "==============================================="; \
		echo ""; \
		echo "Please resolve conflicts in the affected files,"; \
		echo "then stage and commit your changes:"; \
		echo "  git add ."; \
		echo "  git commit --no-edit"; \
		echo ""; \
		read -p "Press Enter after resolving conflicts to continue with PR creation..." dummy; \
		$(MAKE) create-pr SUBTREE_NAME=$(1); \
	fi
endef

# Generate sync targets dynamically
$(foreach subtree,$(SUBTREES), \
	$(eval sync-$(word 1,$(subst :, ,$(subtree))): ## Sync $(word 1,$(subst :, ,$(subtree))) subtree) \
	$(eval sync-$(word 1,$(subst :, ,$(subtree))): ; $$(call sync-subtree,$(word 1,$(subst :, ,$(subtree))),$(word 2,$(subst :, ,$(subtree))),$(word 3,$(subst :, ,$(subtree))),$(word 4,$(subst :, ,$(subtree))))))

# Sync all test apps
sync-test-apps: ## Sync all test app subtrees
	@echo "Syncing all test apps..."
	@current_branch=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$current_branch" != "$(DEFAULT_BRANCH)" ]; then \
		echo "ERROR: You must be on the $(DEFAULT_BRANCH) branch to start a sync"; \
		echo "Current branch: $$current_branch"; \
		echo "Please checkout $(DEFAULT_BRANCH) first: git checkout $(DEFAULT_BRANCH)"; \
		exit 1; \
	fi
	@branch_name="chore/subtree-sync-test-apps"; \
	if git show-ref --verify --quiet refs/heads/$$branch_name; then \
		echo "ERROR: Branch $$branch_name already exists"; \
		echo "Please merge/close that PR and delete your remote and local branch before attempting another sync"; \
		exit 1; \
	fi; \
	echo "Creating branch $$branch_name..."; \
	git checkout -b $$branch_name
	@set -e; \
	conflicts_detected=0; \
	$(foreach app,$(TEST_APPS), \
		app_name=$$(echo "$(app)" | cut -d: -f1); \
		repo_url=$$(echo "$(app)" | cut -d: -f2-3); \
		branch=$$(echo "$(app)" | cut -d: -f4); \
		echo ""; \
		echo "Syncing $$app_name from $$repo_url ($$branch)..."; \
		if ! git subtree pull --prefix=src/test/apps/$$app_name $$repo_url $$branch --squash; then \
			echo "WARNING: Conflicts detected for $$app_name"; \
			conflicts_detected=1; \
		fi;)
	@if [ $$conflicts_detected -eq 1 ]; then \
		echo ""; \
		echo "==============================================="; \
		echo "Merge conflicts detected!"; \
		echo "==============================================="; \
		echo ""; \
		echo "Please resolve conflicts in the affected test-apps/files,"; \
		echo "then stage and commit your changes:"; \
		echo "  git add ."; \
		echo "  git commit --no-edit"; \
		echo ""; \
		read -p "Press Enter after resolving conflicts to continue with PR creation..." dummy; \
	fi
	@$(MAKE) create-pr SUBTREE_NAME=test-apps

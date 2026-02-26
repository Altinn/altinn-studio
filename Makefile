# Altinn Studio Makefile
# Make targets for syncing subtree repositories

# Configuration: name|prefix|repo-url|branch
SUBTREES := localtest|src/Runtime/localtest|https://github.com/Altinn/app-localtest.git|main \
           frontend|src/App/frontend|https://github.com/Altinn/app-frontend-react.git|main \
           backend|src/App/backend|https://github.com/Altinn/app-lib-dotnet.git|main \
           fileanalyzers|src/App/fileanalyzers|https://github.com/Altinn/fileanalyzers-lib-dotnet.git|main \
           codelists|src/App/codelists|https://github.com/Altinn/codelists-lib-dotnet.git|main

# Test apps configuration for subtree syncing (these all live in src/test/apps)
# Format: app-name|repo-url|branch (using | delimiter since URLs contain colons)
TEST_APPS := anonymous-stateless-app|https://dev.altinn.studio/repos/ttd/anonymous-stateless-app.git|master \
            component-library|https://altinn.studio/repos/ttd/component-library.git|master \
            expression-validation-test|https://dev.altinn.studio/repos/ttd/expression-validation-test.git|master \
            frontend-test|https://dev.altinn.studio/repos/ttd/frontend-test.git|next-app-lib \
            multiple-datamodels-test|https://dev.altinn.studio/repos/ttd/multiple-datamodels-test.git|master \
            navigation-test-subform|https://dev.altinn.studio/repos/ttd/navigation-test-subform.git|master \
            payment-test|https://dev.altinn.studio/repos/ttd/payment-test.git|master \
            service-task|https://altinn.studio/repos/ttd/service-task.git|master \
            signering-brukerstyrt|https://altinn.studio/repos/ttd/signering-brukerstyrt.git|master \
            signing-test|https://dev.altinn.studio/repos/ttd/signing-test.git|master \
            stateless-app|https://dev.altinn.studio/repos/ttd/stateless-app.git|master \
            subform-test|https://dev.altinn.studio/repos/ttd/subform-test.git|master

# Default branch
DEFAULT_BRANCH = main

# Extract target names for .PHONY
SUBTREE_TARGETS := $(foreach subtree,$(SUBTREES),sync-$(word 1,$(subst |, ,$(subtree))))

.PHONY: $(SUBTREE_TARGETS) help create-pr sync-test-apps sync-all

help: ## Show this help message
	@echo "Available targets:"
	@$(foreach subtree,$(SUBTREES), \
		echo "  sync-$(word 1,$(subst |, ,$(subtree))) - Sync $(word 1,$(subst |, ,$(subtree))) subtree";)
	@echo "  sync-test-apps - Sync all test app subtrees in src/test/apps"
	@echo "  sync-all       - Sync all subtrees (main + test apps) and create a single PR"
	@echo "  help - Show this help message"

# =============================================================================
# Reusable macros
# =============================================================================

# Check for uncommitted changes
define check-clean-working-tree
	@if ! git diff-index --quiet HEAD --; then \
		echo "ERROR: You have uncommitted changes in your working directory"; \
		echo "Please commit or stash your changes before syncing"; \
		exit 1; \
	fi
endef

# Create a sync branch (usage: $(call create-sync-branch,branch-suffix))
define create-sync-branch
	@branch_name="chore/subtree-sync-$(1)"; \
	if git show-ref --verify --quiet refs/heads/$$branch_name; then \
		echo "ERROR: Branch $$branch_name already exists"; \
		echo "Please merge/close that PR and delete the branch before attempting another sync"; \
		exit 1; \
	fi; \
	echo "Fetching latest $(DEFAULT_BRANCH)..."; \
	git fetch origin $(DEFAULT_BRANCH) && \
	echo "Creating branch $$branch_name from origin/$(DEFAULT_BRANCH)..."; \
	git checkout -b $$branch_name origin/$(DEFAULT_BRANCH)
endef

# Handle merge conflicts (waits for user to resolve, then commits)
define handle-conflicts
	echo ""; \
	echo "==============================================="; \
	echo "Merge conflicts detected!"; \
	echo "==============================================="; \
	echo ""; \
	echo "Please resolve the conflicts in your editor."; \
	read -p "Press Enter after resolving conflicts..." dummy; \
	while git diff --name-only --diff-filter=U | grep -q .; do \
		echo ""; \
		echo "ERROR: There are still unresolved conflicts:"; \
		git diff --name-only --diff-filter=U; \
		echo ""; \
		read -p "Press Enter after resolving all conflicts..." dummy; \
	done; \
	echo "Committing resolved conflicts..."; \
	git add . && git commit --no-edit
endef

# Pull a single subtree (usage: $(call pull-subtree,name,prefix,repo-url,branch))
define pull-subtree
	echo ""; \
	echo "Syncing $(1) subtree from $(3) ($(4))..."; \
	git fetch $(3) $(4) && \
	if GIT_MERGE_AUTOEDIT=no git subtree pull --prefix=$(2) $(3) $(4); then \
		echo "OK: $(1) subtree synced successfully"; \
	else \
		$(handle-conflicts); \
	fi;
endef

# Pull a single test app (usage: $(call pull-test-app,name,repo-url,branch))
define pull-test-app
	echo "Syncing test app $(1) from $(2) ($(3))..."; \
	git fetch $(2) $(3) && \
	if GIT_MERGE_AUTOEDIT=no git subtree pull --prefix=src/test/apps/$(1) $(2) $(3); then \
		echo "OK: $(1) synced successfully"; \
	else \
		$(handle-conflicts); \
	fi;
endef

# Pull all test apps (uses | delimiter)
define pull-all-test-apps
	@$(foreach app,$(TEST_APPS), \
		$(call pull-test-app,$(word 1,$(subst |, ,$(app))),$(word 2,$(subst |, ,$(app))),$(word 3,$(subst |, ,$(app)))))
endef

# Pull all main subtrees
define pull-all-subtrees
	@$(foreach subtree,$(SUBTREES), \
		$(call pull-subtree,$(word 1,$(subst |, ,$(subtree))),$(word 2,$(subst |, ,$(subtree))),$(word 3,$(subst |, ,$(subtree))),$(word 4,$(subst |, ,$(subtree)))))
endef

# =============================================================================
# Targets
# =============================================================================

# Push changes and create pull request for sync job
create-pr:
	@current_branch=$$(git rev-parse --abbrev-ref HEAD); \
	subtree_name=$$(echo $$current_branch | sed 's/chore\/subtree-sync-//'); \
	if [ -n "$(SUBTREE_NAME)" ]; then \
		subtree_name="$(SUBTREE_NAME)"; \
	fi; \
	if command -v gh >/dev/null 2>&1; then \
		echo "Pushing changes to remote..."; \
		git push -u origin $$current_branch && \
		echo "Creating pull request..." && \
		pr_body="⚠️ **DO NOT SQUASH MERGE THIS PR** ⚠️"$$'\n\n'"This is a subtree sync PR. All commits must be preserved to maintain proper git subtree history."$$'\n\n'"**Required merge method:** Merge commit (NOT squash merge)"$$'\n\n'"@coderabbitai ignore"; \
		gh pr create --title "chore: syncing $$subtree_name" --body "$$pr_body" --label "skip-manual-testing,skip-releasenotes" --base $(DEFAULT_BRANCH) --head $$current_branch || \
		echo "WARNING: Failed to create PR. You may need to create it manually."; \
	else \
		echo "WARNING: gh command not found. Skipping automatic PR creation."; \
		echo "Install GitHub CLI to enable automatic PR creation: https://cli.github.com/"; \
	fi

# Generate individual sync targets dynamically
$(foreach subtree,$(SUBTREES), \
	$(eval sync-$(word 1,$(subst |, ,$(subtree))): ; \
		$$(call create-sync-branch,$(word 1,$(subst |, ,$(subtree)))) \
		$$(call pull-subtree,$(word 1,$(subst |, ,$(subtree))),$(word 2,$(subst |, ,$(subtree))),$(word 3,$(subst |, ,$(subtree))),$(word 4,$(subst |, ,$(subtree)))) \
		@$$(MAKE) create-pr SUBTREE_NAME=$(word 1,$(subst |, ,$(subtree)))))

# Sync all test apps
sync-test-apps: ## Sync all test app subtrees
	@echo "Syncing all test apps..."
	$(check-clean-working-tree)
	$(call create-sync-branch,test-apps)
	$(pull-all-test-apps)
	@echo ""
	@echo "All test apps synced successfully!"
	@$(MAKE) create-pr SUBTREE_NAME=test-apps

# Sync all subtrees (main + test apps) in a single PR
sync-all: ## Sync all subtrees and create a single PR
	@echo "Syncing all subtrees..."
	$(check-clean-working-tree)
	$(call create-sync-branch,all)
	$(pull-all-subtrees)
	$(pull-all-test-apps)
	@echo ""
	@echo "All subtrees synced successfully!"
	@$(MAKE) create-pr SUBTREE_NAME=all

.PHONY: tidy-all
tidy-all:
	@find . -type f -name "go.mod" | while read -r gomod_file; do \
		dir=$$(dirname "$$gomod_file"); \
    echo "Running go mod tidy in $$dir"; \
    (cd "$$dir" && go mod tidy); \
	done
	@echo "Finished running go mod tidy in all modules."

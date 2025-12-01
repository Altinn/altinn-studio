
CACHE_DIR := .cache
BIN_DIR := .cache/bin

.PHONY: install
install:
	@echo "Installing dependencies and tools..."
	@yarn --immutable
	@yarn run setup

.PHONY: clean
clean:
	@echo "Cleaning cache and dependencies..."
	@rm -rf $(CACHE_DIR) node_modules

.PHONY: test
test: install
	@echo "Running k6 tests..."
	@export PATH="$(BIN_DIR):$$PATH" && \
	k6 run subform-test-old.js

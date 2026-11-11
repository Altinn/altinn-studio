# Altinn Studio Makefile

.PHONY: tidy-all
tidy-all:
	@find . -type f -name "go.mod" | while read -r gomod_file; do \
		dir=$$(dirname "$$gomod_file"); \
    echo "Running go mod tidy in $$dir"; \
    (cd "$$dir" && go mod tidy); \
	done
	@echo "Finished running go mod tidy in all modules."

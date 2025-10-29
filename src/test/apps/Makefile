.PHONY: build-all clean-all run-all

APP_DIRS := $(wildcard */App)

build-all:
	@for app_dir in $(APP_DIRS); do \
		app_name=$$(basename $$(dirname $$app_dir)); \
		if [ "$$app_name" = "service-task" ]; then \
			echo "Skipping $$app_name (known to not build)..."; \
			continue; \
		fi; \
		echo "Building $$app_name..."; \
		(cd $$app_dir && dotnet build) || exit 1; \
	done

clean-all:
	@(cd ../../App/backend/ && dotnet clean) || exit 1
	@(cd ../../App/fileanalyzers/ && dotnet clean) || exit 1
	@(cd ../../App/codelists/ && dotnet clean) || exit 1
	@for app_dir in $(APP_DIRS); do \
		app_name=$$(basename $$(dirname $$app_dir)); \
		if [ "$$app_name" = "service-task" ]; then \
			echo "Skipping clean for $$app_name (known to not build)..."; \
			continue; \
		fi; \
		echo "Cleaning $$app_name..."; \
		(cd $$app_dir && dotnet clean) || exit 1; \
	done
	@echo "All apps cleaned!"

run-all:
	@for app_dir in $(APP_DIRS); do \
		app_name=$$(basename $$(dirname $$app_dir)); \
		if [ "$$app_name" = "service-task" ]; then \
			echo "[$$app_name] Skipping (known to not build)..."; \
			continue; \
		fi; \
		( \
			cd $$app_dir; \
			ASPNETCORE_ENVIRONMENT=Development dotnet run --no-build --no-launch-profile 2>&1 | sed -u "s/^/[$$app_name] /" \
		) & \
	done; \
	wait

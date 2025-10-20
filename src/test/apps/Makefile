.PHONY: build-all clean-all run-all

APP_DIRS := $(wildcard */App)

build-all:
	@for app_dir in $(APP_DIRS); do \
		app_name=$$(basename $$(dirname $$app_dir)); \
		echo "Building $$app_name..."; \
		(cd $$app_dir && dotnet build) || true; \
	done

clean-all:
	@(cd ../../App/backend/ && dotnet clean) || true
	@(cd ../../App/fileanalyzers/ && dotnet clean) || true
	@(cd ../../App/codelists/ && dotnet clean) || true
	@for app_dir in $(APP_DIRS); do \
		app_name=$$(basename $$(dirname $$app_dir)); \
		echo "Cleaning $$app_name..."; \
		(cd $$app_dir && dotnet clean) || true; \
	done
	@echo "All apps cleaned!"

run-all:
	@for app_dir in $(APP_DIRS); do \
		app_name=$$(basename $$(dirname $$app_dir)); \
		( \
			cd $$app_dir; \
			ASPNETCORE_ENVIRONMENT=Development dotnet run --no-build --no-launch-profile 2>&1 | sed -u "s/^/[$$app_name] /" \
		) & \
	done; \
	wait

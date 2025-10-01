default: build

r: restore
b: build
t: test

ra: restore-all
ba: build-all
ta: test-all

ti: test-integration
tir: test-integration-repeatedly
tid: test-integration-debug

# Main projects (more lightweight)
.PHONY: clean
clean:
	dotnet clean -v q

.PHONY: restore
restore:
	@echo "Restoring NuGet packages..."
	dotnet restore -v q

.PHONY: build
build: restore
	@echo "Building main projects..."
	dotnet build --no-restore -v m

.PHONY: test
test: build
	@echo "Running main tests..."
	dotnet test --no-restore --no-build -v m

# All projects (analyzers, integration tests...)
.PHONY: clean-all
clean-all:
	dotnet clean -v q solutions/All.sln

.PHONY: restore-all
restore-all:
	@echo "Restoring NuGet packages..."
	dotnet restore -v q solutions/All.sln

.PHONY: build-all
build-all: restore-all
	@echo "Building all projects..."
	dotnet build --no-restore -v m solutions/All.sln

.PHONY: test-all
test-all: build-all
	@echo "Running all tests..."
	dotnet test --no-restore --no-build -v m solutions/All.sln

# Only integration tests
.PHONY: test-integration
test-integration:
ifdef filter
	dotnet test test/Altinn.App.Integration.Tests/ --logger "console;verbosity=detailed" --filter "$(filter)"
else
	dotnet test test/Altinn.App.Integration.Tests/ --logger "console;verbosity=detailed"
endif

.PHONY: test-integration-repeatedly
test-integration-repeatedly:
ifdef filter
	@TEST_FILTER="$(filter)" bash run-repeatedly.sh
else
	@bash run-repeatedly.sh
endif

.PHONY: test-integration-debug
test-integration-debug:
	TEST_KEEP_CONTAINERS=1 make ti filter="FullyQualifiedName~BasicAppTests.Full&DisplayName~SimplifiedNoPrefill&DisplayName~OldUser"

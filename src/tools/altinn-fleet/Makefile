SOLUTION := Altinn.Studio.Fleet.slnx
PREFIX ?= $(HOME)/.local

.PHONY: build
build:
	dotnet build $(SOLUTION)

.PHONY: test
test:
	dotnet test $(SOLUTION)

.PHONY: fmt
fmt:
	dotnet tool restore
	dotnet csharpier format .

.PHONY: lint
lint:
	dotnet tool restore
	dotnet csharpier check .

# Puts `fleet` on the PATH, as $(PREFIX)/bin/fleet. It needs the .NET runtime that global.json names.
.PHONY: install
install:
	dotnet publish src/Altinn.Studio.Fleet.Cli -c Release -o $(PREFIX)/lib/altinn-fleet
	mkdir -p $(PREFIX)/bin
	ln -sf $(PREFIX)/lib/altinn-fleet/fleet $(PREFIX)/bin/fleet

# Path: Makefile

restore:
	dotnet restore

build: restore
	dotnet build -c Release --no-restore

publish: build
	dotnet publish -c Release --no-restore --no-build -o publish

clean:
	dotnet clean
	rm -rf publish/

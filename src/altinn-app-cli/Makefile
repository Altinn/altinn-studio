# Path: Makefile

build:
	dotnet build
    
executable-osx-x64:
	dotnet publish -c Release -o publish/osx-x64 -r osx-x64 --self-contained

executable-osx-arm64:
	dotnet publish -c Release -o publish/osx-arm64 -r osx-arm64 --self-contained

executable-win-x64:
	dotnet publish -c Release -o publish/win-x64 -r win-x64 --self-contained

executable-linux-x64:
	dotnet publish -c Release -o publish/linux-x64 -r linux-x64 --self-contained
	
executable-linux-arm64:
	dotnet publish -c Release -o publish/linux-arm64 -r linux-arm64 --self-contained
	
executables: executable-osx-x64 executable-osx-arm64 executable-win-x64 executable-linux-x64 executable-linux-arm64

archives:
	mkdir -p publish/archives
	tar -czvf publish/archives/osx-x64.tar.gz publish/osx-x64/altinn-app-cli
	tar -czvf publish/archives/osx-arm64.tar.gz publish/osx-arm64/altinn-app-cli
	tar -czvf publish/archives/linux-x64.tar.gz publish/linux-x64/altinn-app-cli
	tar -czvf publish/archives/linux-arm64.tar.gz publish/linux-arm64/altinn-app-cli
	zip -r publish/archives/win-x64.zip publish/win-x64/altinn-app-cli.exe

checksums:
	sha512sum publish/archives/osx-x64.tar.gz > publish/archives/osx-x64.tar.gz.sha512
	sha512sum publish/archives/osx-arm64.tar.gz > publish/archives/osx-arm64.tar.gz.sha512
	sha512sum publish/archives/linux-x64.tar.gz > publish/archives/linux-x64.tar.gz.sha512
	sha512sum publish/archives/linux-arm64.tar.gz > publish/archives/linux-arm64.tar.gz.sha512
	sha512sum publish/archives/win-x64.zip > publish/archives/win-x64.zip.sha512

bundles: executables archives checksums

clean:
	dotnet clean
	rm -rf publish/
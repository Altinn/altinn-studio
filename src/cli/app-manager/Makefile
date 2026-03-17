# Path: Makefile

restore:
	dotnet restore

build: restore
	dotnet build -c Release --no-restore
    
pack: build
	dotnet pack -c Release --no-restore --no-build -o publish 

clean:
	dotnet clean
	rm -rf publish/

install-locally: pack
	dotnet tool install --global --add-source ./publish Altinn.Studio.Cli --prerelease
	
reinstall-locally: uninstall-locally clean pack
	dotnet tool install --global --add-source ./publish Altinn.Studio.Cli --prerelease

uninstall-locally:
	dotnet tool uninstall --global Altinn.Studio.Cli
#!/bin/bash

version=1.0.93-alpha

key=oy2plioasdcybgars6kq3afdd7jhjnluzfa4vpb63c47ki

pwd=`pwd`

echo Pack and publish nuget packages: $version $pwd

echo API ...
cd Altinn.App.Api
dotnet build -c Release
dotnet pack -c Release --include-source -p:SymbolPackageFormat=snupkg

cd bin/Release
dotnet nuget push Altinn.App.API.$version.nupkg -k $key -s https://api.nuget.org/v3/index.json

echo COMMON ...
cd $pwd/Altinn.App.Common
dotnet build -c Release
dotnet pack -c Release --include-source -p:SymbolPackageFormat=snupkg

cd bin/Release
dotnet nuget push Altinn.App.Common.$version.nupkg -k $key -s https://api.nuget.org/v3/index.json

echo SERVICES ...
cd $pwd/Altinn.App.PlatformServices
dotnet build -c Release
dotnet pack -c Release --include-source -p:SymbolPackageFormat=snupkg

cd bin/Release
dotnet nuget push Altinn.App.PlatformServices.$version.nupkg -k $key -s https://api.nuget.org/v3/index.json
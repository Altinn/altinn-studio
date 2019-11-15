#dotnet:3.0-sdk
FROM mcr.microsoft.com/dotnet/core/sdk:3.0-alpine AS build
WORKDIR /src/AltinnCore/
COPY src/AltinnCore/Common ./Common
COPY src/AltinnCore/Authentication ./Authentication
COPY src/AltinnCore/ServiceLibrary ./ServiceLibrary
COPY src/AltinnCore/Testdata ./Testdata
COPY src/AltinnCore/RepositoryClient ./RepositoryClient
COPY src/AltinnCore/Altinn.Process ./Altinn.Process
COPY src/AltinnCore/Runtime ./Runtime
WORKDIR /src/AltinnCore/Runtime
RUN dotnet build AltinnCore.Runtime.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore.Runtime.csproj -c Release -o /app_output

# Altinn-Studio runtime app
FROM altinn-runtime-app:latest AS generate-runtime-app

#dotnet:3.0-sdk
FROM mcr.microsoft.com/dotnet/core/sdk:3.0-alpine AS final
EXPOSE 80
WORKDIR /AltinnService
COPY src/AltinnCore/Testdata /Testdata
WORKDIR /app
COPY --from=build /app_output .
COPY --from=generate-runtime-app /applications/runtime/dist/runtime.js ./wwwroot/runtime/js/react/runtime.js
COPY --from=generate-runtime-app /applications/runtime/dist/runtime.css ./wwwroot/runtime/css/react/runtime.css
ENTRYPOINT ["dotnet", "AltinnCore.Runtime.dll"]

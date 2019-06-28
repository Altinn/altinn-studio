FROM mcr.microsoft.com/dotnet/core/sdk:2.2-alpine3.9 AS build
WORKDIR /src/AltinnCore/
COPY src/AltinnCore/Common ./Common
COPY src/AltinnCore/Authentication ./Authentication
COPY src/AltinnCore/ServiceLibrary ./ServiceLibrary
COPY src/AltinnCore/Templates ./Templates
COPY src/AltinnCore/Testdata ./Testdata
COPY src/AltinnCore/RepositoryClient ./RepositoryClient
COPY src/AltinnCore/Runtime ./Runtime
WORKDIR /src/AltinnCore/Runtime
RUN dotnet build AltinnCore.Runtime.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore.Runtime.csproj -c Release -o /app_output

# Altinn-Studio runtime app
FROM altinn-runtime-app:latest AS generate-runtime-app

#dotnet:2.2-sdk - TODO: Investigate why we're using SDK here
FROM mcr.microsoft.com/dotnet/core/sdk:2.2-alpine3.9 AS final
EXPOSE 80
WORKDIR /AltinnService
COPY src/AltinnCore/Testdata /Testdata
COPY src/AltinnCore/Templates /Templates
WORKDIR /app
COPY --from=build /app_output .
COPY --from=generate-runtime-app /applications/runtime/dist/runtime.js ./wwwroot/runtime/js/react/runtime.js
COPY --from=generate-runtime-app /applications/runtime/dist/runtime.css ./wwwroot/runtime/css/react/runtime.css
ENTRYPOINT ["dotnet", "AltinnCore.Runtime.dll"]

#dotnet:2.2-sdk
FROM microsoft/dotnet@sha256:7d8256eead49252ac2de7079268659102f44a6e40e7890fec2a7633d0b374470 AS build
WORKDIR /src/AltinnCore/
COPY src/AltinnCore/Common ./Common
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

#dotnet:2.2-aspnetcore-runtime
FROM microsoft/dotnet@sha256:7a9dfa52e5c02d1764964bbb034d9467d798020aa3747e2ddaea1ee3d2d386b8 AS final
EXPOSE 80
WORKDIR /AltinnService
COPY src/AltinnCore/Testdata /Testdata
COPY src/AltinnCore/Templates /Templates
WORKDIR /app
COPY --from=build /app_output .
COPY --from=generate-runtime-app /applications/runtime/dist/runtime.js ./wwwroot/runtime/js/react/runtime.js
COPY --from=generate-runtime-app /applications/runtime/dist/runtime.css ./wwwroot/runtime/css/react/runtime.css
ENTRYPOINT ["dotnet", "AltinnCore.Runtime.dll"]

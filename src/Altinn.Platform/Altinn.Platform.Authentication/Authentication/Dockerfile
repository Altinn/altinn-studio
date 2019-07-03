#microsoft/dotnet:2.2-sdk
FROM microsoft/dotnet@sha256:7d8256eead49252ac2de7079268659102f44a6e40e7890fec2a7633d0b374470 AS build
WORKDIR Authentication/

COPY Authentication ./Authentication
WORKDIR Authentication/

RUN dotnet build Altinn.Platform.Authentication.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Authentication.csproj -c Release -o /app_output

#microsoft/dotnet:2.2-aspnetcore-runtime
FROM microsoft/dotnet@sha256:7a9dfa52e5c02d1764964bbb034d9467d798020aa3747e2ddaea1ee3d2d386b8 AS final
EXPOSE 5040
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Authentication.dll"]

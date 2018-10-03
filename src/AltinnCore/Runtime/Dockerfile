FROM microsoft/dotnet:2.1-sdk AS build
WORKDIR /src/
COPY src/AltinnCore ./AltinnCore
WORKDIR /src/AltinnCore/Runtime
RUN dotnet build AltinnCore.Runtime.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore.Runtime.csproj -c Release -o /app_output

FROM microsoft/dotnet:2.1-aspnetcore-runtime AS final
EXPOSE 80
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "AltinnCore.Runtime.dll"]
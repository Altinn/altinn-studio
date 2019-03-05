#dotnet:2.1.300-sdk
FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS build
WORKDIR /src/AltinnCore/

COPY src/AltinnCore/RuntimeDataService ./RuntimeDataService
WORKDIR /src/AltinnCore/RuntimeDataService

RUN dotnet build AltinnCore.DataService.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore.DataService.csproj -c Release -o /app_output

FROM microsoft/dotnet:2.1-aspnetcore-runtime AS final
EXPOSE 5010
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "AltinnCore.DataService.dll"]

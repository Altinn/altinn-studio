#dotnet:2.1.300-sdk
FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS build
WORKDIR /src/AltinnCore/

COPY src/AltinnCore/RuntimeDb ./RuntimeDb
WORKDIR /src/AltinnCore/RuntimeDb

RUN dotnet build AltinnCore.Runtime.Db.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore.Runtime.Db.csproj -c Release -o /app_output

FROM microsoft/dotnet:2.1-aspnetcore-runtime AS final
EXPOSE 44355
WORKDIR /App
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "AltinnCore.Runtime.Db.dll"]

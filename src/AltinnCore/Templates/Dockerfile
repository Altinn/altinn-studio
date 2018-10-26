#altinn-runtime with sdk
FROM altinntjenestercontainerregistry.azurecr.io/altinn-runtime:333 AS build
WORKDIR /AltinnService/
COPY Implementation/*.cs ./
COPY Model/*.cs ./
RUN dotnet publish -o publish/

FROM microsoft/dotnet:2.1-aspnetcore-runtime AS final
WORKDIR /app

#copy altinn-runtime app
COPY --from=build /app .

#copy service
WORKDIR /AltinnService/bin/
COPY --from=build /AltinnService/publish/AltinnService* ./
WORKDIR /AltinnService/
COPY . .
WORKDIR /app

#entrypoint
ENTRYPOINT ["dotnet", "AltinnCore.Runtime.dll"]

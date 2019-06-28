FROM mcr.microsoft.com/dotnet/core/sdk:2.2-alpine3.9 AS build
WORKDIR Storage/

COPY Storage ./Storage
WORKDIR Storage/

RUN dotnet build Altinn.Platform.Storage.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Storage.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:2.2-alpine3.9 AS final
EXPOSE 5010
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Storage.dll"]

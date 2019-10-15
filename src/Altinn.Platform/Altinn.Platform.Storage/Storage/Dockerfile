FROM mcr.microsoft.com/dotnet/core/sdk:3.0-alpine AS build
WORKDIR Storage/

COPY Storage ./Storage
WORKDIR Storage/

RUN dotnet build Altinn.Platform.Storage.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Storage.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:3.0-alpine AS final
EXPOSE 5010
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Storage.dll"]

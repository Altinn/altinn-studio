FROM mcr.microsoft.com/dotnet/core/sdk:2.2-alpine3.9 AS build
WORKDIR Authorization/

COPY Authorization ./Authorization
COPY Authorization.Interface ./Authorization
WORKDIR Authorization/

RUN dotnet build Altinn.Platform.Authorization.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Authorization.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:2.2-alpine3.9 AS final
EXPOSE 5030
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Authorization.dll"]

FROM mcr.microsoft.com/dotnet/core/sdk:2.2-alpine3.9 AS build
WORKDIR Authentication/

COPY Authentication ./Authentication
WORKDIR Authentication/

RUN dotnet build Altinn.Platform.Authentication.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Authentication.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:2.2-alpine3.9 AS final
EXPOSE 5040
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Authentication.dll"]

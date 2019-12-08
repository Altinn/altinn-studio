FROM mcr.microsoft.com/dotnet/core/sdk:3.1-alpine AS build
WORKDIR /Authentication

COPY Authentication .

RUN dotnet build Altinn.Platform.Authentication.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Authentication.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-alpine AS final
EXPOSE 5040
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Authentication.dll"]

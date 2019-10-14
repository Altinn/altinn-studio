FROM mcr.microsoft.com/dotnet/core/sdk:3.0-alpine AS build
WORKDIR Authorization/

COPY Authorization ./Authorization
COPY Authorization.Interface ./Authorization.Interface
COPY Altinn.Authorization.ABAC ./Altinn.Authorization.ABAC
WORKDIR Authorization/

RUN dotnet build Altinn.Platform.Authorization.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Authorization.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:3.0-alpine AS final
EXPOSE 5030
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Authorization.dll"]

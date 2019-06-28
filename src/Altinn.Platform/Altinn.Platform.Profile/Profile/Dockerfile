FROM mcr.microsoft.com/dotnet/core/sdk:2.2-alpine3.9 AS build
WORKDIR Profile/

COPY Profile ./Profile
WORKDIR Profile/

RUN dotnet build Altinn.Platform.Profile.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Profile.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:2.2-alpine3.9 AS final
EXPOSE 5030
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Profile.dll"]

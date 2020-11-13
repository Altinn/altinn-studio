FROM mcr.microsoft.com/dotnet/core/sdk:3.1-alpine AS build
WORKDIR /

COPY /App ./App

WORKDIR /App

RUN dotnet build App.csproj -c Release -o /app_output
RUN dotnet publish App.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-alpine AS final
EXPOSE 5005
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.App.dll"]

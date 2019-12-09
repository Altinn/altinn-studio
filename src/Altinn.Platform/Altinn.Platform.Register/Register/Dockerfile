FROM mcr.microsoft.com/dotnet/core/sdk:3.1-alpine AS build
WORKDIR Register/

COPY Register ./Register
WORKDIR Register/

RUN dotnet build Altinn.Platform.Register.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Register.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-alpine AS final
EXPOSE 5020
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Register.dll"]

#microsoft/dotnet:3.0-sdk
FROM mcr.microsoft.com/dotnet/core/sdk:3.0-alpine AS build
WORKDIR Register/

COPY Register ./Register
WORKDIR Register/

RUN dotnet build Altinn.Platform.Register.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Register.csproj -c Release -o /app_output

#microsoft/dotnet:3.0-aspnetcore-runtime
FROM FROM mcr.microsoft.com/dotnet/core/runtime:3.0-alpine AS final AS final
EXPOSE 5020
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "Altinn.Platform.Register.dll"]

FROM mcr.microsoft.com/dotnet/sdk:5.0-alpine AS build
WORKDIR /

COPY /App ./App

WORKDIR /App

RUN dotnet build App.csproj -c Release -o /app_output
RUN dotnet publish App.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/aspnet:5.0-alpine AS final
EXPOSE 5005
WORKDIR /app
COPY --from=build /app_output .

# setup the user and group
RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
USER dotnet
RUN mkdir /tmp/logtelemetry

ENTRYPOINT ["dotnet", "Altinn.App.dll"]

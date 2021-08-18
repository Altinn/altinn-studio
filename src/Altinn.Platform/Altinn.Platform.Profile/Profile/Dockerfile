FROM mcr.microsoft.com/dotnet/sdk:5.0.400-alpine3.13 AS build
WORKDIR Profile/

COPY Profile ./Profile
WORKDIR Profile/

RUN dotnet build Altinn.Platform.Profile.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Profile.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/aspnet:5.0.9-alpine3.13 AS final
EXPOSE 5030
WORKDIR /app
COPY --from=build /app_output .
# setup the user and group
# the user will have no password, using shell /bin/false and using the group dotnet
RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
# update permissions of files if neccessary before becoming dotnet user
USER dotnet
RUN mkdir /tmp/logtelemetry

ENTRYPOINT ["dotnet", "Altinn.Platform.Profile.dll"]

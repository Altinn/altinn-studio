FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine@sha256:b3b30660074659c3f41373d7a3d6f2512b79453b017c0754693215eb64854745 AS build
WORKDIR /App

COPY /App/App.csproj .
RUN dotnet restore App.csproj

COPY /App .

RUN dotnet publish App.csproj --configuration Release --output /app_output

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine@sha256:f7c13dc6c0bfc8f988a3677b739296c95794557ddd0e62e315eae8fc3aa505c1 AS final
EXPOSE 5005
WORKDIR /App
COPY --from=build /app_output .
ENV ASPNETCORE_URLS=

# setup the user and group
# busybox doesn't include longopts, so the options are roughly
# -g --gid
# -u --uid
# -G --group
# -D --disable-password
# -s --shell
RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet

USER dotnet
RUN mkdir /tmp/logtelemetry

ENTRYPOINT ["dotnet", "App.dll"]

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine@sha256:d9f4f4a5d99a43799b500ee1365c370e3233822fbe7d43666715d9b5b5cda2ab AS build
WORKDIR /App

COPY /App/App.csproj .
RUN dotnet restore App.csproj

COPY /App .

RUN dotnet publish App.csproj --configuration Release --output /app_output

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine@sha256:4718c6b44771e710f91d6129912cb4fa3b90024ec4e23b3f8ce89822fba612fd AS final
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

# Add globalization timezone support
RUN apk add --no-cache icu-libs icu-data-full tzdata
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

USER dotnet
RUN mkdir /tmp/logtelemetry

ENTRYPOINT ["dotnet", "Altinn.Application.dll"]

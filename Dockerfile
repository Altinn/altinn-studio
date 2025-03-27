FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine@sha256:7d3a75ca5c8ac4679908ef7a2591b9bc257c62bd530167de32bba105148bb7be AS build
WORKDIR /src

COPY ./src/LocalTest.csproj .
RUN dotnet restore LocalTest.csproj

COPY ./src .
RUN dotnet publish LocalTest.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine@sha256:0389d5b7d60f75ebbeec3bfffd2ad0a06d234e7b998231a5a86abf5e919a7d01 AS final
EXPOSE 5101
WORKDIR /app
COPY --from=build /app_output .

# Copy various data
COPY ./testdata /testdata

# setup the user and group (not important for LocalTest and this removes write access to /AltinnPlatformLocal)
# RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
# USER dotnet

ENTRYPOINT ["dotnet", "LocalTest.dll"]

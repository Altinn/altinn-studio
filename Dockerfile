FROM mcr.microsoft.com/dotnet/sdk:6.0-alpine AS build

COPY ./src ./src

WORKDIR /src
RUN dotnet restore LocalTest.csproj
RUN dotnet build LocalTest.csproj -c Release -o /app_output
RUN dotnet publish LocalTest.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/aspnet:6.0-alpine AS final
EXPOSE 5101
WORKDIR /app
COPY --from=build /app_output .

# Copy various data
COPY ./testdata /testdata

# setup the user and group (not important for LocalTest and this removes write access to /AltinnPlatformLocal)
# RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
# USER dotnet

ENTRYPOINT ["dotnet", "LocalTest.dll"]

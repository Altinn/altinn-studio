FROM mcr.microsoft.com/dotnet/sdk:10.0.402-alpine3.24@sha256:496914451b05ac5a24592024362ec370c3a2d3c3fe817f864e4aa55c4c194a56 AS build
WORKDIR /src

COPY Runtime/localtest/src/LocalTest.csproj Runtime/localtest/src/
WORKDIR /src/Runtime/localtest/src
RUN dotnet restore LocalTest.csproj

COPY Runtime/localtest/src/ .
COPY Runtime/common/dotnet/Altinn.Studio.Runtime.Common/HostBridge/ /src/Runtime/common/dotnet/Altinn.Studio.Runtime.Common/HostBridge/
COPY Runtime/common/dotnet/Altinn.Studio.Runtime.Common/EnvTopology/ /src/Runtime/common/dotnet/Altinn.Studio.Runtime.Common/EnvTopology/
RUN dotnet publish LocalTest.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/aspnet:10.0.13-alpine3.24@sha256:ecf8dcbaab8ebc4bdfb2322d6fe4217bbb118894310ebb6d53c580874ab4b27d AS final
ENV ASPNETCORE_URLS=http://*:5101/
EXPOSE 5101
# Create the storage folder if it isn't mapped to a volume runtime
RUN mkdir /AltinnPlatformLocal
WORKDIR /app
COPY --from=build /app_output .

# Copy various data
COPY Runtime/localtest/testdata /testdata
HEALTHCHECK --interval=1s --timeout=1s --retries=20 \
    CMD wget -nv -t1 --spider 'http://localhost:5101/health' || exit 1

# setup the user and group (not important for LocalTest and this removes write access to /AltinnPlatformLocal)
# RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
# USER dotnet

ENTRYPOINT ["dotnet", "LocalTest.dll"]

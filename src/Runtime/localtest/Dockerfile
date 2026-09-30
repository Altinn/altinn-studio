FROM mcr.microsoft.com/dotnet/sdk:10.0.302-alpine3.23@sha256:d8ee39817ca03a3757288e83c37ed73cc969a286c603b827c7cbe33add1c2d1c AS build
WORKDIR /src

COPY Runtime/localtest/src/LocalTest.csproj Runtime/localtest/src/
WORKDIR /src/Runtime/localtest/src
RUN dotnet restore LocalTest.csproj

COPY Runtime/localtest/src/ .
COPY Runtime/common/dotnet/Altinn.Studio.Runtime.Common/HostBridge/ /src/Runtime/common/dotnet/Altinn.Studio.Runtime.Common/HostBridge/
COPY Runtime/common/dotnet/Altinn.Studio.Runtime.Common/EnvTopology/ /src/Runtime/common/dotnet/Altinn.Studio.Runtime.Common/EnvTopology/
RUN dotnet publish LocalTest.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/aspnet:10.0.10-alpine3.23@sha256:27b6b84beeede74fd16886177d360799c8e4299ceadfbd64eef57bafead7878a AS final
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

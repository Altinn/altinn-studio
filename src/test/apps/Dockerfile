FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
RUN apt-get update && apt-get install -y make && rm -rf /var/lib/apt/lists/*

COPY src/App/backend/ ./App/backend/
COPY src/App/fileanalyzers/ ./App/fileanalyzers/
COPY src/App/codelists/ ./App/codelists/
COPY src/test/apps/ ./test/apps/

WORKDIR /src/test/apps
RUN make clean-all && make build-all

FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /app

# Install make
RUN apt-get update && apt-get install -y make && rm -rf /var/lib/apt/lists/*

COPY --from=build /src/ /src/

WORKDIR /src/test/apps

# Run all apps with signal handling for graceful shutdown
CMD ["bash", "-c", "trap 'trap - SIGTERM SIGINT; kill -TERM 0' SIGTERM SIGINT; make run-all"]

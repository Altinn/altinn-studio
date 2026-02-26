FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
RUN apt-get update && apt-get install -y make && rm -rf /var/lib/apt/lists/*

COPY src/App/backend/ /src/App/backend/
COPY src/App/fileanalyzers/ /src/App/fileanalyzers/
COPY src/App/codelists/ /src/App/codelists/
COPY src/test/apps/ /src/test/apps/

RUN cd /src/test/apps && make build-all

FROM mcr.microsoft.com/dotnet/sdk:8.0
RUN apt-get update && apt-get install -y make && rm -rf /var/lib/apt/lists/*

COPY --from=build /src/ /src/
WORKDIR /src/test/apps

COPY src/test/apps/docker-run-all-apps.sh ./
RUN chmod +x docker-run-all-apps.sh

CMD ["./docker-run-all-apps.sh"]

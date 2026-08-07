FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:a63e271360552d87b556a2c1a78cfdfd2519ec33137acdce9ac16cff939f1ac0 AS build

WORKDIR /app

COPY . .

RUN dotnet tool install --version 9.0.0 --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

ENV StudioOidcLoginSettings__FetchClientIdAndSecretFromRootEnvFile=false
ENV StudioOidcLoginSettings__ClientId=dummyRequired
ENV StudioOidcLoginSettings__ClientSecret=dummyRequired

RUN dotnet restore src/Designer/Designer.csproj && \
    dotnet build src/Designer/Designer.csproj --no-restore && \
    dotnet ef migrations script --project src/Designer/Designer.csproj --no-build --idempotent -o /app/migrations.sql

FROM alpine:3.24.1@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b AS final
COPY --from=build /app/migrations.sql migrations.sql
RUN apk --no-cache add postgresql-client

ENTRYPOINT ["sh", "-c", "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations.sql"]

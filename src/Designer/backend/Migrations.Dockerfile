FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:f47429a125e38d83f5231a78dde18106cb447d541f7ffdc5b8af4d227a323d95 AS build

WORKDIR /app

COPY . .

RUN dotnet tool install --version 9.0.0 --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

ENV OidcLoginSettings__FetchClientIdAndSecretFromRootEnvFile=false
ENV OidcLoginSettings__ClientId=dummyRequired
ENV OidcLoginSettings__ClientSecret=dummyRequired

RUN dotnet ef migrations script --project src/Designer/Designer.csproj --idempotent -o /app/migrations.sql

FROM alpine:3.22.1@sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1 AS final
COPY --from=build /app/migrations.sql migrations.sql
RUN apk --no-cache add postgresql-client

ENTRYPOINT ["sh", "-c", "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations.sql"]

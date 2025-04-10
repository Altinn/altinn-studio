FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:2303ad5956875eb82d3c6195e43f0e8e1378a6252869f2d4d200e067130ff5b5 AS build

WORKDIR /app

COPY . .

RUN dotnet tool install --version 9.0.0 --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

ENV OidcLoginSettings__FetchClientIdAndSecretFromRootEnvFile=false
ENV OidcLoginSettings__ClientId=dummyRequired
ENV OidcLoginSettings__ClientSecret=dummyRequired

RUN dotnet ef migrations script --project src/Designer/Designer.csproj --idempotent -o /app/migrations.sql

FROM alpine:3.21.3@sha256:a8560b36e8b8210634f77d9f7f9efd7ffa463e380b75e2e74aff4511df3ef88c AS final
COPY --from=build /app/migrations.sql migrations.sql
RUN apk --no-cache add postgresql-client

ENTRYPOINT ["sh", "-c", "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations.sql"]

FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build

WORKDIR /app

COPY . .

RUN dotnet tool install --version 9.0.0 --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

ENV OidcLoginSettings__FetchClientIdAndSecretFromRootEnvFile=false
ENV OidcLoginSettings__ClientId=dummyRequired
ENV OidcLoginSettings__ClientSecret=dummyRequired

RUN dotnet ef migrations script --project src/Designer/Designer.csproj --idempotent -o /app/migrations.sql

FROM alpine:3.21.2 AS final
COPY --from=build /app/migrations.sql migrations.sql
RUN apk --no-cache add postgresql-client

ENTRYPOINT ["sh", "-c", "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations.sql"]

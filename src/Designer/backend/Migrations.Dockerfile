FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:f874300da43fbbd39beb726ee37adda9cf6d091e92959eb1cf25777b13b885fe AS build

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

FROM alpine:3.23.3@sha256:25109184c71bdad752c8312a8623239686a9a2071e8825f20acb8f2198c3f659 AS final
COPY --from=build /app/migrations.sql migrations.sql
RUN apk --no-cache add postgresql-client

ENTRYPOINT ["sh", "-c", "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations.sql"]

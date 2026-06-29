FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:2412b9f7db4aa7ceac5a8c9d41385616cbd7bb8d18c298334cafad22f7647e04 AS build

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

FROM alpine:3.23.5@sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40 AS final
COPY --from=build /app/migrations.sql migrations.sql
RUN apk --no-cache add postgresql-client

ENTRYPOINT ["sh", "-c", "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations.sql"]

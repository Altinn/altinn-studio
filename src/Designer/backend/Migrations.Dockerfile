FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine@sha256:cc02b814237a76c4735fb6eeee87181597b5e56f2ce458a435e527674d91f4d7 AS build

WORKDIR /src

COPY common/dotnet/Altinn.Studio.Common ./common/dotnet/Altinn.Studio.Common
COPY common/dotnet/Altinn.Studio.Common.Telemetry ./common/dotnet/Altinn.Studio.Common.Telemetry
COPY cli/.editorconfig cli/Directory.Build.props cli/Directory.Packages.props ./cli/
COPY cli/common/dotnet/.editorconfig cli/common/dotnet/Directory.Build.props ./cli/common/dotnet/
COPY cli/common/dotnet/Altinn.Studio.AppDist ./cli/common/dotnet/Altinn.Studio.AppDist
COPY Designer/backend ./Designer/backend

RUN dotnet tool install --version 10.0.10 --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

ENV StudioOidcLoginSettings__FetchClientIdAndSecretFromRootEnvFile=false
ENV StudioOidcLoginSettings__ClientId=dummyRequired
ENV StudioOidcLoginSettings__ClientSecret=dummyRequired

RUN dotnet restore Designer/backend/src/Designer/Designer.csproj && \
    dotnet build Designer/backend/src/Designer/Designer.csproj --no-restore && \
    dotnet ef migrations script --project Designer/backend/src/Designer/Designer.csproj --no-build --idempotent -o /app/migrations.sql

FROM alpine:3.24.1@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b AS final
COPY --from=build /app/migrations.sql migrations.sql
RUN apk --no-cache add postgresql-client

ENTRYPOINT ["sh", "-c", "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations.sql"]

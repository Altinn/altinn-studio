FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine@sha256:d8ee39817ca03a3757288e83c37ed73cc969a286c603b827c7cbe33add1c2d1c AS build

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

FROM alpine:3.24.3@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a AS final
COPY --from=build /app/migrations.sql migrations.sql
RUN apk --no-cache add postgresql-client

ENTRYPOINT ["sh", "-c", "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations.sql"]

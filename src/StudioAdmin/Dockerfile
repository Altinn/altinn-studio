FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:f271ed7d0fd9c5a7ed0acafed8a2bc978bb65c19dcd2eeea0415adef142ffc87 AS build
WORKDIR /build
COPY . .
RUN dotnet publish StudioAdmin.csproj -c Release -o /release


FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:5e8dca92553951e42caed00f2568771b0620679f419a28b1335da366477d7f98 AS final
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /release .

ENTRYPOINT ["dotnet", "Altinn.Studio.Admin.dll"]

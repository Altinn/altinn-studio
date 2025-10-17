FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:f47429a125e38d83f5231a78dde18106cb447d541f7ffdc5b8af4d227a323d95 AS build
WORKDIR /build
COPY . .
RUN dotnet publish StudioAdmin.csproj -c Release -o /release


FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:5e8dca92553951e42caed00f2568771b0620679f419a28b1335da366477d7f98 AS final
WORKDIR /app
COPY --from=build /release .

ENTRYPOINT ["dotnet", "Altinn.Studio.Admin.dll"]

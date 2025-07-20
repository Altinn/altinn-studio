FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:35c77bbcd86b3153f9d7d6b2e88ae99d300e5a570cf2827501c0ba8b0aacdf08 AS build
WORKDIR /build
COPY . .
RUN dotnet publish StudioAdmin.csproj -c Release -o /release


FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:89a7a398c5acaa773642cfabd6456f33e29687c1529abfaf068929ff9991cb66 AS final
WORKDIR /app
COPY --from=build /release .

ENTRYPOINT ["dotnet", "Altinn.Studio.Admin.dll"]

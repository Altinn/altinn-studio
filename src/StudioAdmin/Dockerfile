FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:35c77bbcd86b3153f9d7d6b2e88ae99d300e5a570cf2827501c0ba8b0aacdf08 AS build
WORKDIR /build
COPY . .
RUN dotnet publish StudioAdmin.csproj -c Release -o /release


FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:ea72850bd81ba5c95ba88641a4fa315471bef9e3d1cd7e26c2594faff56e3a36 AS final
WORKDIR /app
COPY --from=build /release .

ENTRYPOINT ["dotnet", "Altinn.Studio.Admin.dll"]

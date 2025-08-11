FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine@sha256:2fe880002c458a6e95a3f8bb38b63c0f2e21ffefcb01c0223c4408cc91ad7d9d AS build
WORKDIR /build
COPY . .
RUN dotnet publish StudioAdmin.csproj -c Release -o /release


FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine@sha256:d4bf3d8c8f0236341ddd93d15208152e26bc6dcc9d34c635351a3402c284137f AS final
WORKDIR /app
COPY --from=build /release .

ENTRYPOINT ["dotnet", "Altinn.Studio.Admin.dll"]

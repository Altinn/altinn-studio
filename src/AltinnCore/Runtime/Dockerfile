#dotnet:2.1-sdk
FROM microsoft/dotnet@sha256:c50b596c93b11167ef7c6174a2717a18382d28965c11984691a0479c990ada3d AS build
WORKDIR /src/AltinnCore/
COPY src/AltinnCore/Common ./Common
COPY src/AltinnCore/ServiceLibrary ./ServiceLibrary
COPY src/AltinnCore/RepositoryClient ./RepositoryClient
COPY src/AltinnCore/Runtime ./Runtime
WORKDIR /src/AltinnCore/Runtime
RUN dotnet build AltinnCore.Runtime.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore.Runtime.csproj -c Release -o /app_output

#dotnet:2.1-aspnetcore-runtime
FROM microsoft/dotnet@sha256:b99ecca89d5a1d8919782f01b639d2376267456f6b7b5cc1b9d7fca94f579869 AS final
EXPOSE 80
WORKDIR /AltinnService
COPY src/AltinnCore/Templates/AltinnService /AltinnService
WORKDIR /app
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "AltinnCore.Runtime.dll"]

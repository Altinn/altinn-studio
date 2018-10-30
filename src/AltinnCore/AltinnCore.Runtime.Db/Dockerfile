#dotnet:2.1.300-sdk
FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS build
WORKDIR /src/AltinnCore/AltinnCore.Runtime.Db

# Copy csproj and restore as distinct layers
COPY *.csproj ./

# Copy everything else and build
COPY . ./

RUN dotnet build AltinnCore.Runtime.Db.csproj -c Release -o /app_output
RUN dotnet publish AltinnCore.Runtime.Db.csproj -c Release -o /app_output

#dotnet:2.1.300-sdk
FROM microsoft/dotnet@sha256:d1ad61421f637a4fe6443f2ec204cca9fe10bf833c31adc6ce70a4f66406375e AS final
EXPOSE 44399
WORKDIR /App
COPY --from=build /app_output .
ENTRYPOINT ["dotnet", "AltinnCore.Runtime.Db.dll"]
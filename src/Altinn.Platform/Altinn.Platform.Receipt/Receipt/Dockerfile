FROM mcr.microsoft.com/dotnet/sdk:5.0.404-alpine3.14 AS build

# Copy receipt backend
WORKDIR /src/Altinn.Platform/Altinn.Platform.Receipt/Receipt
COPY src/Altinn.Platform/Altinn.Platform.Receipt/Receipt .

# Build and publish
RUN dotnet build Altinn.Platform.Receipt.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Receipt.csproj -c Release -o /app_output

# Copy receipt frontend to public folder
FROM altinn-receipt-react-app:latest AS generate-receipt-react-app

FROM mcr.microsoft.com/dotnet/aspnet:5.0.13-alpine3.14 AS final
EXPOSE 5060
WORKDIR /app
COPY --from=build /app_output .
COPY --from=generate-receipt-react-app /build/receipt/dist/receipt.js ./wwwroot/receipt/js/react/receipt.js
COPY --from=generate-receipt-react-app /build/receipt/dist/receipt.css ./wwwroot/receipt/css/receipt.css

# setup the user and group
# the user will have no password, using shell /bin/false and using the group dotnet
RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
# update permissions of files if neccessary before becoming dotnet user
USER dotnet
RUN mkdir /tmp/logtelemetry

ENTRYPOINT ["dotnet", "Altinn.Platform.Receipt.dll"]

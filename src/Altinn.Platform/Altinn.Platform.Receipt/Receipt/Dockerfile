FROM mcr.microsoft.com/dotnet/core/sdk:3.1-alpine AS build

# Copy common, used for exposing language ini files
WORKDIR /src/AltinnCore/
COPY src/AltinnCore/ .

# Copy receipt backend
WORKDIR /src/Altinn.Platform/Altinn.Platform.Receipt/Receipt
COPY src/Altinn.Platform/Altinn.Platform.Receipt/Receipt .

# Build and publish
RUN dotnet build Altinn.Platform.Receipt.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Receipt.csproj -c Release -o /app_output

# Copy receipt frontend to public folder
FROM altinn-receipt-react-app:latest AS generate-receipt-react-app

FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-alpine AS final
EXPOSE 5060
WORKDIR /app
COPY --from=build /app_output .
COPY --from=generate-receipt-react-app /applications/receipt/dist/receipt.js ./wwwroot/receipt/js/react/receipt.js
COPY --from=generate-receipt-react-app /applications/receipt/dist/receipt.css ./wwwroot/receipt/css/receipt.css

# setup the user and group
# the user will have no password, using shell /bin/false and using the group dotnet
RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
# update permissions of files if neccessary before becoming dotnet user
USER dotnet
ENTRYPOINT ["dotnet", "Altinn.Platform.Receipt.dll"]

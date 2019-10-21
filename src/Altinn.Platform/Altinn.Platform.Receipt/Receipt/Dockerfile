#microsoft/dotnet:2.2-sdk
FROM microsoft/dotnet@sha256:7d8256eead49252ac2de7079268659102f44a6e40e7890fec2a7633d0b374470 AS build

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

#microsoft/dotnet:2.2-aspnetcore-runtime
FROM microsoft/dotnet@sha256:7a9dfa52e5c02d1764964bbb034d9467d798020aa3747e2ddaea1ee3d2d386b8 AS final
EXPOSE 5060
WORKDIR /app
COPY --from=build /app_output .
COPY --from=generate-receipt-react-app /applications/receipt/dist/receipt.js ./wwwroot/receipt/js/react/receipt.js
COPY --from=generate-receipt-react-app /applications/receipt/dist/receipt.css ./wwwroot/receipt/css/receipt.css
ENTRYPOINT ["dotnet", "Altinn.Platform.Receipt.dll"]

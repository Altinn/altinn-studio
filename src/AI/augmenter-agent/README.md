# Altinn Augmenter Agent

PDF generator service built with ASP.NET Core and Typst.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check, returns `{"status": "ok"}` |
| POST | `/generate` | Synchronous PDF generation. Accepts multipart form with files. Returns PDF. |
| POST | `/generate-async` | Async PDF generation. Requires `callback-url` field. Returns `{"status": "accepted"}` and POSTs PDF to callback URL. |

### Allowed file content types

- `application/pdf`
- `application/xml`
- `text/xml`
- `application/json`

## Development

```bash
# Build
dotnet build

# Run tests
dotnet test

# Run locally
dotnet run --project src/Altinn.Augmenter.Agent
```

## Docker

```bash
docker compose up --build
```

The service runs on port **8072**.

## Testing

```bash
curl -X POST http://localhost:8072/generate -F "file=@test/testdata/zero-byte.pdf;type=application/pdf" --output generated.pdf
```

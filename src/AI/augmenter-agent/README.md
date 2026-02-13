# Altinn Augmenter Agent

A microservice that generates PDFs from uploaded files using [Typst](https://typst.app/), with both synchronous and asynchronous (callback-based) endpoints.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Typst CLI](https://github.com/typst/typst) — installed via PATH or WinGet

## Getting started

### Run locally

```bash
dotnet run --project src/Altinn.Augmenter.Agent
```

The service starts at `http://localhost:8072`.

### Run with Docker

```bash
docker compose up --build
```

The Docker image installs Typst from the Alpine Edge repository and runs as a non-root user.

### Run tests

```bash
dotnet test
```

Tests that require the Typst CLI are skipped automatically if it is not installed.

### Quick smoke test

```bash
curl -X POST http://localhost:8072/generate \
  -F "file=@test/testdata/zero-byte.pdf;type=application/pdf" \
  --output generated.pdf
```

## API

### `GET /health`

Returns `200 OK` with `{ "status": "ok" }`.

### `POST /generate`

Synchronous PDF generation. Returns the PDF directly.

**Request:** `multipart/form-data`

| Field  | Type | Required | Description                                                                                           |
| ------ | ---- | -------- | ----------------------------------------------------------------------------------------------------- |
| `file` | file | Yes (1+) | Files to process. Allowed types: `application/pdf`, `application/xml`, `text/xml`, `application/json` |

**Response:** `200 OK` with `Content-Type: application/pdf`

### `POST /generate-async`

Asynchronous PDF generation. Accepts the job immediately and POSTs the result to a callback URL.

**Request:** `multipart/form-data`

| Field          | Type   | Required | Description                               |
| -------------- | ------ | -------- | ----------------------------------------- |
| `file`         | file   | Yes (1+) | Same file constraints as `/generate`      |
| `callback-url` | string | Yes      | URL to receive the generated PDF via POST |

**Response:** `202 Accepted` with `{ "status": "accepted" }`

The callback receives a `multipart/form-data` POST with the PDF in a field named `file`.

## Configuration

All settings are in `appsettings.json` and can be overridden with environment variables.

| Section         | Key                     | Default                     | Description                             |
| --------------- | ----------------------- | --------------------------- | --------------------------------------- |
| `Upload`        | `MaxFileBytes`          | 10 MB                       | Max size per uploaded file              |
| `Upload`        | `MaxTotalBytes`         | 50 MB                       | Max total request size                  |
| `PdfGeneration` | `ProcessTimeoutSeconds` | 60                          | Typst process timeout                   |
| `PdfGeneration` | `TemplatePath`          | `pdf-templates/default.typ` | Path to Typst template                  |
| `Callback`      | `AllowedPatterns`       | `[]`                        | Allowlist for callback URLs (see below) |
| `Callback`      | `TimeoutSeconds`        | 30                          | HTTP timeout for callback POST          |
| `Callback`      | `MaxRetries`            | 3                           | Max retry attempts for failed callbacks |
| `Callback`      | `RetryBaseDelaySeconds` | 2                           | Base delay for exponential backoff      |
| `Typst`         | `Path`                  | `typst`                     | Path to Typst executable                |

### Callback URL patterns

The `AllowedPatterns` array controls which callback URLs are accepted. Patterns support wildcards:

- `*` in host matches a single DNS label: `*.altinn.no` matches `app.altinn.no` but not `deep.sub.altinn.no`
- `:*` in port matches any port: `http://localhost:*/*`
- `*` in path matches a single segment: `/api/*/callback`
- Trailing `/*` matches everything under that path: `/api/*` matches `/api/v1/deep/path`

In development, `http://localhost:*/*` is configured by default.

## Architecture

```
                          ┌─────────────────────────────┐
  POST /generate ────────>│  MultipartParserService      │──> PdfGeneratorService ──> PDF response
                          └─────────────────────────────┘
                          ┌─────────────────────────────┐     ┌──────────────────────┐
  POST /generate-async ──>│  MultipartParserService      │──> │  PdfGenerationQueue   │
                          │  CallbackUrlValidator        │    │  (bounded channel)    │
                          └─────────────────────────────┘    └──────────┬───────────┘
                                                                        │
                                                             ┌──────────▼───────────┐
                                                             │  BackgroundService    │
                                                             │  ┌─ PdfGenerator      │
                                                             │  └─ CallbackService ──┼──> POST to callback
                                                             │  (retry + backoff)    │
                                                             └──────────────────────┘
```

### PDF generation pipeline

Each call to `PdfGeneratorService.GeneratePdfAsync` follows these steps:

1. Creates an isolated temp directory with a unique GUID (`/tmp/augmenter-agent/<guid>/`)
2. Copies the Typst template into the temp dir as `input.typ`
3. Writes a `data.json` file with the timestamp (and later other metadata)
4. Spawns `typst compile input.typ output.pdf`
5. Reads stdout/stderr concurrently to avoid pipe deadlocks
6. Returns the PDF bytes and cleans up the temp directory

The template uses Typst's native `json("data.json")` to load data, avoiding `string.Format` escaping issues with Typst's `{ }` syntax.

### Thread safety and concurrency

The service is fully safe for concurrent requests. Each `GeneratePdfAsync` invocation creates its own temp directory keyed by `Guid.NewGuid()`, so parallel requests never share files:

```
Request A  →  /tmp/augmenter-agent/a1b2c3.../input.typ + data.json + output.pdf
Request B  →  /tmp/augmenter-agent/d4e5f6.../input.typ + data.json + output.pdf
```

Typst's `json("data.json")` resolves relative to the input file's directory, so each process reads its own data file. There is no shared mutable state between requests.

### Async job processing

The `/generate-async` endpoint enqueues jobs into a bounded channel (capacity: 100). A single `BackgroundService` dequeues and processes jobs sequentially. If the callback POST fails, it retries with exponential backoff (capped at shift 16 to prevent int overflow). Metrics counters track processed, failed, and retried jobs via `System.Diagnostics.Metrics`.

### Security

- **Callback URL allowlist:** All callback URLs are validated against configured regex patterns with a 1-second match timeout
- **File validation:** Content-type allowlist and per-file/total size limits
- **Process isolation:** Typst runs as a child process with a configurable timeout; the entire process tree is killed on timeout
- **Docker:** Runs as non-root user in Alpine container

## Project structure

```
src/Altinn.Augmenter.Agent/
├── Configuration/          Options classes (CallbackOptions, UploadOptions, PdfGenerationOptions)
├── Endpoints/              Minimal API endpoint definitions
├── Models/                 Record types (ParsedFormData, PdfGenerationJob, UploadedFile)
├── Services/               Core services and interfaces
├── pdf-templates/          Typst templates
└── Program.cs              Service registration and middleware pipeline

test/Altinn.Augmenter.Agent.Tests/
├── Integration/            End-to-end tests with TestWebApplicationFactory and WireMock
└── Unit/                   Isolated service tests
```

# Altinn Augmenter Agent

A service that generates a PDF from uploaded files with [Typst](https://typst.app/). Nothing in this repository calls
or deploys it yet.

`POST /generate` returns the PDF. `POST /generate-async` accepts the job, and a background worker posts the PDF to
the request's `callback-url`. The jobs wait in an in-memory queue, so a restart loses them.

## Run

You need the .NET SDK and the [Typst CLI](https://github.com/typst/typst) on `PATH`. Run
`dotnet run --project src/Altinn.Augmenter.Agent`, or `docker compose up --build`, and the service listens on
`http://localhost:8072`:

```bash
curl -X POST http://localhost:8072/generate \
  -F "file=@test/testdata/zero-byte.pdf;type=application/pdf" \
  --output generated.pdf
```

Run the tests with `dotnet test`. The tests that need the Typst CLI pass without running when it is not installed.

## Constraints

- The service rejects every callback URL until `Callback:AllowedPatterns` has a pattern. Development allows
  `http://localhost:*/*`. The allowlist matches the URL, not the address it resolves to, so it does not stop a
  callback to a private address.
- The template reads its data with Typst's `json("data.json")`, so the service never escapes values into Typst
  syntax.

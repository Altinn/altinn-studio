# CodeRabbit Review TODOs (PR #17684)

Feedback from CodeRabbit that has not been addressed yet.
Validating the application in a real environment comes first — the architecture
may change substantially (state, load balancing, file system dependencies).

---

## Architecture / Environment dependencies

- [ ] **Local file system for temp files (PdfGeneratorService)**
  Uses `Path.GetTempPath()` for temporary Typst files.
  Does not work with multiple pod replicas / load balancing without shared storage.
  Consider whether this is acceptable for the POC, or whether we need a shared volume / blob storage.

---

## Security related (SSRF / validation)

- [ ] **SSRF protection in CallbackService** (`CallbackService.cs:12`)
  CallbackService posts to a user-supplied URL without network restrictions.
  CallbackUrlValidator checks the pattern match, but does not block private/loopback
  IP addresses. Consider a `SocketsHttpHandler` with a `ConnectCallback` that rejects
  private IPs after DNS resolution (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16,
  169.254.0.0/16, ::1, fc00::/7, fe80::/10).

---

## CallbackUrlValidator improvements

- [ ] **Scheme comparison is case sensitive** (`CallbackUrlValidator.cs:74`)
  `uri.Scheme` always returns lowercase, but the pattern scheme is compared as-is.
  It should be normalized to lowercase.

- [ ] **Host part of the pattern should be case folded** (`CallbackUrlValidator.cs:135`)
  DNS names are case insensitive (RFC 4343). `uri.Host` returns lowercase,
  but the pattern host is compared as-is.

---

## Error handling

- [ ] **GenerateEndpoints: unhandled PDF errors return 500** (`GenerateEndpoints.cs:39`)
  `GeneratePdfAsync` can throw `InvalidOperationException` (timeout, compilation errors),
  but this is not handled in the `/generate` endpoint. It should catch these and return
  an appropriate status code (e.g. 422/500 with an error message).

- [ ] **Caller cancellation masked as a timeout** (`PdfGeneratorService.cs:56-68`)
  When the linked `CancellationTokenSource` fires, both caller cancellation and the
  internal timeout produce an `OperationCanceledException`. The two should be
  distinguished so logging and the error message are correct.

---

## Robustness

- [ ] **PdfGeneratorService: string.Format is fragile for Typst templates** (`PdfGeneratorService.cs:16`)
  Typst uses `{ }` for code blocks. If the template contains unescaped
  curly braces, `string.Format` can fail. The current code uses a JSON data file
  instead, but verify that this is sufficient for future templates.

---

## Tests

- [ ] **PdfGeneratorServiceTests: skip guard for missing Typst** (`PdfGeneratorServiceTests.cs`)
  The tests depend on the `typst` binary being installed. A skip guard should be added
  so the tests are skipped (rather than failing) in CI/dev environments without Typst.

---

## Minor / nitpicks

- [ ] **ParsedFormData: use `IReadOnlyList<UploadedFile>`** (`ParsedFormData.cs:3`)
  `List<UploadedFile>` is mutable inside a `record` type. Consider `IReadOnlyList`.

- [ ] **Test project: wildcard package versions** (`Tests.csproj`)
  `"2.*"` and `"17.*"` make builds non-deterministic. Consider pinning versions
  or using `Directory.Packages.props`.

- [ ] **UploadedFile: byte[] breaks record equality** (`UploadedFile.cs:3`)
  `byte[]` uses reference equality in records. Be aware of this if
  equality is used in assertions or collections.

- [ ] **README: missing curl example for /generate-async** (`README.md`)
  Show the callback URL field in the example.

- [ ] **README: add language identifiers to code blocks** (`README.md`)
  The ASCII art and directory tree blocks are missing ` ```text `.

---

## Already addressed (for reference)

- [x] Task.Run fire-and-forget → replaced with PdfGenerationQueue + BackgroundService
- [x] Scoped service lifetime → uses IServiceScopeFactory in the BackgroundService
- [x] StandardOutput deadlock → reads stdout and stderr concurrently
- [x] Typst process timeout → CancellationTokenSource with a timeout
- [x] Request size limits → (check whether configured via FormOptions)
- [x] Queue full → returns 503
- [x] Exponential backoff overflow → capped with Math.Min(attempt-1, 16)
- [x] Dockerfile: Alpine community repo → uses the --repository flag
- [x] CancellationToken on SendPdfAsync → already implemented
- [x] IPv6 literal parsing in CallbackUrlValidator → handled with a bracket check

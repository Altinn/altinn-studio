# CodeRabbit Review TODOs (PR #17684)

Tilbakemeldinger fra CodeRabbit som ikke er adressert ennå.
Prioriterer validering av applikasjonen i et miljø først — arkitekturen
kan endre seg vesentlig (tilstand, lastbalansering, filsystem-avhengigheter).

---

## Arkitektur / Miljø-avhengigheter

- [ ] **Lokalt filsystem for temp-filer (PdfGeneratorService)**
  Bruker `Path.GetTempPath()` for midlertidige Typst-filer.
  Fungerer ikke med flere pod-replika / lastbalansering uten delt lagring.
  Vurder om dette er OK for POC eller om vi trenger delt volum / blob storage.

---

## Sikkerhetsrelatert (SSRF / Validering)

- [ ] **SSRF-beskyttelse i CallbackService** (`CallbackService.cs:12`)
  CallbackService poster til bruker-oppgitt URL uten nettverksrestriksjoner.
  CallbackUrlValidator sjekker pattern-match, men blokkerer ikke private/loopback
  IP-adresser. Vurder `SocketsHttpHandler` med `ConnectCallback` som avviser
  private IP-er etter DNS-oppslag (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16,
  169.254.0.0/16, ::1, fc00::/7, fe80::/10).

---

## CallbackUrlValidator-forbedringer

- [ ] **Scheme-sammenligning er case-sensitiv** (`CallbackUrlValidator.cs:74`)
  `uri.Scheme` returnerer alltid lowercase, men pattern-scheme sammenlignes as-is.
  Bør normalisere til lowercase.

- [ ] **Host-del i pattern bør case-foldes** (`CallbackUrlValidator.cs:135`)
  DNS-navn er case-insensitive (RFC 4343). `uri.Host` returnerer lowercase,
  men pattern-host sammenlignes as-is.

---

## Feilhåndtering

- [ ] **GenerateEndpoints: Uhåndterte PDF-feil gir 500** (`GenerateEndpoints.cs:39`)
  `GeneratePdfAsync` kan kaste `InvalidOperationException` (timeout, kompileringsfeil),
  men dette er ikke håndtert i `/generate`-endpointet. Bør fange og returnere
  passende feilkode (f.eks. 422/500 med feilmelding).

- [ ] **Caller-cancellation maskert som timeout** (`PdfGeneratorService.cs:56-68`)
  Når den linkede `CancellationTokenSource` avfyres, gir både caller-cancellation
  og intern timeout `OperationCanceledException`. Bør skille mellom de to for
  riktig logging og feilmelding.

---

## Robusthet

- [ ] **PdfGeneratorService: string.Format er skjørt for Typst-maler** (`PdfGeneratorService.cs:16`)
  Typst bruker `{ }` for kodeblokker. Hvis malen inneholder uescapede
  krøllparenteser kan `string.Format` feile. Gjeldende kode bruker JSON-data-fil
  i stedet, men verifiser at dette er tilstrekkelig for fremtidige maler.

---

## Test

- [ ] **PdfGeneratorServiceTests: Skip-guard for manglende Typst** (`PdfGeneratorServiceTests.cs`)
  Testene avhenger av at `typst`-binæren er installert. Bør legge til skip-guard
  slik at testene hoppes over (ikke feiler) i CI/dev-miljøer uten Typst.

---

## Småting / Nitpicks

- [ ] **ParsedFormData: Bruk `IReadOnlyList<UploadedFile>`** (`ParsedFormData.cs:3`)
  `List<UploadedFile>` er mutable i en `record`-type. Vurder `IReadOnlyList`.

- [ ] **Test-prosjekt: Wildcard package-versjoner** (`Tests.csproj`)
  `"2.*"` og `"17.*"` gir ikke-deterministiske builds. Vurder å pinne versjoner
  eller bruk `Directory.Packages.props`.

- [ ] **UploadedFile: byte[] bryter record-equality** (`UploadedFile.cs:3`)
  `byte[]` bruker referanse-equality i records. Vær klar over dette hvis
  equality brukes i assertions eller samlinger.

- [ ] **README: Mangler curl-eksempel for /generate-async** (`README.md`)
  Vis callback-url-feltet i eksempel.

- [ ] **README: Legg til språk-identifikator på kodeblokker** (`README.md`)
  ASCII-art og katalogtre-blokker mangler ` ```text `.

---

## Allerede adressert (for referanse)

- [x] Task.Run fire-and-forget → erstattet med PdfGenerationQueue + BackgroundService
- [x] Scoped service-lifetime → bruker IServiceScopeFactory i BackgroundService
- [x] StandardOutput-deadlock → leser stdout og stderr concurrent
- [x] Typst-prosess timeout → CancellationTokenSource med timeout
- [x] Request size limits → (sjekk om konfigurert via FormOptions)
- [x] Queue full → returnerer 503
- [x] Exponential backoff overflow → capped med Math.Min(attempt-1, 16)
- [x] Dockerfile: Alpine community repo → bruker --repository flag
- [x] CancellationToken på SendPdfAsync → allerede implementert
- [x] IPv6 literal-parsing i CallbackUrlValidator → håndtert med bracket-sjekk

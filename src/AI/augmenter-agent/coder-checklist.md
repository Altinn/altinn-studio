# Kode-sjekkliste for PR-klargjering

Generisk sjekkliste utleidd frå reelle CodeRabbit-tilbakemeldingar.
Bruk denne som ein "pre-PR review"-rutine før du opnar pull request.

---

## 1. Sikkerheit

- [ ] **SSRF-validering av brukarleverte URL-ar.**
  Valider ikkje berre skjema (HTTP/HTTPS), men òg at verten ikkje peikar mot interne nettverk (loopback, private IP-område som `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, link-local `169.254.0.0/16`, og IPv6-ekvivalentar). Bruk DNS-oppslag og sjekk alle resolva adresser.

- [ ] **Avgrens storleik på innkommande data.**
  Konfigurer eksplisitte grenser for request body og filopplasting (`RequestSizeLimit`, `MultipartBodyLengthLimit`, eller tilsvarande). Ikkje les vilkårleg store filer rett inn i minnet.

- [ ] **Regex med timeout.**
  Bruk `RegexOptions.None` med eksplisitt `matchTimeout`-parameter for å hindre ReDoS (Regular Expression Denial of Service) ved ondsinnet input.

- [ ] **Verifiser Content-Type.**
  Stol ikkje blindt på oppgjeven Content-Type frå klienten. Valider at innhaldet faktisk samsvarar med forventa type der det er relevant.

- [ ] **Valider og sanitér all brukarinput.**
  Sjekk at obligatoriske felt finst, at verdiar er innanfor forventa grenser, og at strenger ikkje inneheld uønskte teikn eller mønster.

---

## 2. Arkitektur og livssyklus (DI)

- [ ] **Rett DI-livstid (Scoped vs Singleton vs Transient).**
  Tenester som berre brukar singletons (t.d. `ILogger`, `IConfiguration`) bør ikkje registrerast som Scoped. Ein Scoped-teneste fanga i ein bakgrunnsoppgåve vil bli brukt etter at scopet er disponert.

- [ ] **Unngå fire-and-forget med `Task.Run`.**
  Bakgrunnsarbeid som startar med `Task.Run` inne i ein request-handler er usynleg for graceful shutdown og kan bruke tenester frå eit disponert scope. Bruk heller `BackgroundService` med `Channel<T>` eller `IBackgroundTaskQueue`.

- [ ] **Bakgrunnsjobbar skal drenerast ved shutdown.**
  Sørg for at bakgrunnstenester implementerer `BackgroundService` eller `IHostedService` slik at verten kan vente på pågåande arbeid ved avslutning.

- [ ] **Kø-kapasitet og backpressure.**
  Bounded channels med `BoundedChannelFullMode.Wait` vil blokkere avsendaren når køen er full. Vurder `TryWrite` + HTTP 429/503 i staden, og gjer kapasiteten konfigurerbar.

---

## 3. Prosess og I/O

- [ ] **Unngå deadlock ved prosessredireksjon.**
  Dersom du redirigerer både `StandardOutput` og `StandardError`, les begge straumane konkurrent. Viss du berre treng éin, sett `RedirectStandardOutput = false` for den andre. Eit fullt OS-pipe-buffer vil blokkere prosessen.

- [ ] **Sett timeout på eksterne prosessar.**
  Ein ekstern prosess (CLI-verktøy o.l.) kan henge. Bruk `CancellationTokenSource` med `TimeSpan` og drep prosessen om fristen går ut.

- [ ] **Propager `CancellationToken` heile vegen.**
  Alle asynkrone kall (`ReadToEndAsync`, `PostAsync`, `WaitForExitAsync`, osv.) bør ta imot ein `CancellationToken`. Manglar det, kan metoden blokkere på ubestemt tid.

---

## 4. Feilhandtering

- [ ] **Fang breitt nok rundt I/O-operasjonar.**
  `ReadFormAsync`, `CopyToAsync` og liknande kan kaste `IOException` og `OperationCanceledException` i tillegg til `InvalidOperationException`. Sørg for at alle relevante unntakstypar gjev meiningsfull feilmelding, ikkje generisk 500.

- [ ] **Eigne unntakstypar for valideringsfeil.**
  Bruk dedikerte unntaksklassar (t.d. `ValidationException`) for å skilje valideringsfeil frå systemfeil, slik at korrekt HTTP-statuskode kan returnerast.

- [ ] **Retry med backoff-grense.**
  Eksponentiell backoff (`1 << attempt`) kan gje overflow for høge verdiar. Sett eit tak (t.d. `Math.Min(attempt - 1, 16)`) og ein maks-delay. Logg kvart retry-forsøk.

- [ ] **Dead-letter / feilkø for asynkrone jobbar.**
  Jobbar som feilar etter maks antal retry bør loggast og/eller leggjast i ein feilkø for manuell oppfølging, ikkje berre kastast bort i stilla.

---

## 5. HTTP-semantikk

- [ ] **Bruk rett statuskode.**
  `202 Accepted` for asynkrone operasjonar som er lagt i kø, ikkje `200 OK`. `429 Too Many Requests` eller `503 Service Unavailable` når køen er full. `400 Bad Request` for valideringsfeil.

- [ ] **Konsistent response-kontrakt.**
  Returner alltid same JSON-struktur for feil (t.d. `{ "error": "..." }`). Dokumenter forventa response for kvar statuskode.

---

## 6. Data og templating

- [ ] **Unngå `string.Format` med brukarmalverk.**
  `string.Format` krev at `{` og `}` i malen vert escaped. Bruk heller token-basert erstatning (t.d. `template.Replace("{{PLACEHOLDER}}", value)`) for å unngå `FormatException`.

- [ ] **Bruk uforanderlege (immutable) modellar der det passar.**
  `record`-typar gjev verdisemantikk, men `List<T>` og `byte[]` er mutable og bryt strukturell likskap. Bruk `IReadOnlyList<T>` for samlingar i records.

- [ ] **`DateTimeOffset` framfor `DateTime`.**
  `DateTime` manglar tidssoneinformasjon, noko som kan gje feil ved serialisering, lagring og samanlikning. Bruk `DateTimeOffset` for tidsstempel som kjem frå eller skal til eksterne system.

---

## 7. Docker og bygg

- [ ] **Sjekk at nødvendige pakke-repositories er aktiverte.**
  Alpine-baserte images har gjerne berre `main`-repoen aktiv. Dersom du treng pakkar frå `community`, legg til repoen eksplisitt i Dockerfile (`echo '...' >> /etc/apk/repositories && apk update`).

- [ ] **Reproduserbare avhengigheiter.**
  Unngå wildcard-versjonar i pakkefiler (t.d. `"2.*"` i `.csproj`). Pin til spesifikke versjonar, eller bruk sentral pakkestyring (`Directory.Packages.props`) og commit lock-filer (`packages.lock.json`).

- [ ] **Multistage build og minimal image.**
  Bygg i eit SDK-image, kopier berre publisert output til eit runtime-image. Bruk `.dockerignore` for å ekskludere testprosjekt, dokumentasjon og andre unødvendige filer.

---

## 8. Testar

- [ ] **Skip-guards for eksterne avhengigheiter.**
  Testar som krev installerte verktøy (t.d. Typst, Docker, ein database) bør ha ein skip-guard (`Assert.Skip` / `Skip.If`) slik at dei ikkje feilar med kryptiske meldingar i CI eller på utviklarmaskiner utan verktøyet.

- [ ] **Deterministiske assertions.**
  Unngå assertions på tidsstempel, GUID-ar eller anna ikkje-deterministisk data utan å kontrollere verdien. Bruk `Freeze`-mønster eller injiser kjende verdiar i testoppsettet.

- [ ] **Dispose-mønster i testar.**
  `HttpClient`, `HttpResponseMessage`, `MemoryStream` og andre `IDisposable`-objekt skal disposerast. Bruk `using`-deklarasjonar i testar for å unngå ressurslekkasjar som kan påverke andre testar.

- [ ] **Skill mellom integrasjonstest og einingstest.**
  Eintestar skal ikkje starte ein HTTP-server eller kalle eksterne tenester. Bruk `WebApplicationFactory<T>` eller liknande for integrasjonstestar, og mock-ar / stub-ar for eintstestar.

---

## 9. Kodestil og konvensjonar

- [ ] **`IReadOnlyList<T>` over `List<T>` i offentlege API-ar.**
  Eksponér uforanderlege samlingar i metodesignaturar og DTO-ar for å signalisere at kallaren ikkje skal endre innhaldet.

- [ ] **Record-semantikk med forsiktigheit.**
  `record`-typar gjev auto-generert `Equals`/`GetHashCode` basert på alle felt. `byte[]` og andre referansetypar brukar referanselikskap, noko som kan gje subtile feil i samlingar og assertions.

- [ ] **DRY for konfigurasjon.**
  Samle konfigurasjonsgrenser og standardverdiar på éin stad (t.d. ein `Options`-klasse med `IOptions<T>`-mønster) i staden for å hardkode verdiar spreidde i koden.

- [ ] **Konsekvent namngiving og prosjektstruktur.**
  Følg eksisterande konvensjonar i kodebasen for mappestruktur, namngiving av klasser/grensesnitt, og namnerom (namespaces).

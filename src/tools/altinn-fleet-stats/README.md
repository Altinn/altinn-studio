# Altinn Studio Fleet Statistics

Statistikk-dashboard over Altinn 3-apper i prod og tt02. Henter klonene, parser strukturen, lagrer i SQLite og viser det i nettleseren.

Kjøres som én Docker-container. UX-teamet kan starte den lokalt og klikke seg fram til svar uten å røre terminalen.

## Kom i gang

```bash
# Bygg og start
docker compose up -d --build

# Åpne dashbordet
open http://localhost:9091
```

### Installer som app på Mac

Verktøyet er en PWA — kan installeres som standalone app:

**Chrome / Edge:**

1. Åpne http://localhost:9091
2. Trykk install-ikonet i adresselinjen (eller ⋮ → "Install Altinn Studio Fleet Statistics…")
3. App'en dukker opp i Launchpad og kan startes som vanlig app

**Safari (macOS Sonoma+):**

1. Åpne http://localhost:9091
2. Fil → Legg til i Dock

App'en kjører i et eget vindu uten browser-chrome. Docker-container må fortsatt være oppe i bakgrunnen siden den er datakilden — `docker compose up -d` overlever maskin-restart hvis du har Docker Desktop satt til å starte automatisk.

I dashbordet:

1. Klikk **Hent apper** — laster ned (eller oppdaterer) alle klonede apper for valgt miljø
2. Klikk **Re-analyser** — parser appene og oppdaterer databasen
3. Bla gjennom fanene (Oversikt / Komponenter / Innstillinger / Språk / Prosess / Grensesnitt / Søk)

Begge operasjonene er idempotente — trygt å kjøre igjen. Re-analyse skipper apper som ikke har endret seg.

## Grensesnitt-fanen

Fanen **Grensesnitt** svarer på hvilke offentlige grensesnitt Altinn.App-bibliotekene tilbyr, og hvor mange apper som faktisk bruker hvert enkelt: hva er mye brukt, hva er lite brukt, og hva rører ingen.

Tallene kommer fra to kilder som møtes i databasen:

- **Katalogen** — alle offentlige grensesnitt i `Altinn.App.Core`, `Altinn.App.Api` og `Altinn.App.Clients.Fiks`, med signatur, dokumentasjonstekst, `[Obsolete]`-merking og om grensesnittet er ment for apper å implementere (`[ImplementableByApps]`).
- **Appene** — deres egen C#-kode, lest av scanneren. Tre former for bruk skilles fra hverandre: appen **implementerer** grensesnittet, **registrerer** det i DI (`services.AddTransient<IFoo, Bar>()`), eller **injiserer** det (bruker typen uten å implementere den).

En app teller som implementerende også når den arver en av bibliotekets baseklasser i stedet for å navngi grensesnittet — `class MinValidator : GenericFormDataValidator<T>` implementerer `IFormDataValidator`. Katalogen inneholder derfor de 70 klassene i biblioteket som implementerer et grensesnitt, og arven løses transitivt. Detaljvisningen viser «arver GenericFormDataValidator» på disse appene, så tallet kan etterprøves.

Detaljvisningen for ett grensesnitt viser signaturen, hvilke apper som bruker det (med klassenavn, filbane og lenke rett til repoet), fordeling per organisasjon og bibliotekversjon, og hvilke andre grensesnitt de samme appene implementerer.

To lister skiller seg ut:

- **Utvidelsespunkt uten bruk** — ment for apper, men ingen tar dem i bruk.
- **Grensesnitt utenfor katalogen** — apper implementerer dem, men de finnes ikke i dagens bibliotek. Som regel noe som er fjernet, og som appene henger igjen på.

### Oppdatere katalogen

Katalogen er generert fra bibliotekets egne, innsjekkede public-API-snapshots (`PublicApiTests.PublicApi_ShouldNotChange_Unintentionally.verified.txt`) og ligger som `backend/altinn_fleet/data/interface_catalog.json`. Den følger med i imaget, så dashbordet virker uten at biblioteket er sjekket ut ved siden av.

Kjør generatoren på nytt når bibliotekets offentlige API har endret seg:

```bash
python3 backend/scripts/generate_interface_catalog.py
```

`--check` feiler hvis den innsjekkede katalogen er utdatert, og egner seg i CI. Bygg imaget på nytt etter en regenerering, og kjør **Re-analyser** — databasen fylles fra katalogen ved hver analyse.

## Konfigurasjon

All konfigurasjon gjøres i UI under fanen **Konfigurasjon** — miljøvalg (prod/tt02), git-credentials og concurrency-innstillinger. Endringer lagres og trer i kraft uten å restarte containeren.

## Bytte mellom prod og tt02

Bytt miljø i UI under fanen **Konfigurasjon** og klikk **Hent apper** for å fylle den. Hver miljø får sin egen klone- og database-mappe under volumet, så data fra det andre miljøet beholdes:

```
/data/
├── apps-prod/        ← klonede prod-apper
├── apps-tt02/        ← klonede tt02-apper
├── fleet-prod.sqlite ← database for prod
├── fleet-tt02.sqlite ← database for tt02
└── .cache/           ← API-cache (1 t TTL)
```

## Arkitektur

```
┌────────────────────────────────────────┐
│ Docker container (localhost:9091)      │
│                                        │
│  React (Vite) ──→ FastAPI ──→ SQLite   │
│      ▲              │                  │
│      │              ▼                  │
│      └── SSE ── fetcher / scanner      │
│                     │                  │
│                     ▼                  │
│              git clone over HTTPS      │
│              (altinn.studio)           │
└────────────────────────────────────────┘
```

- **Backend**: Python 3.12 + FastAPI + httpx + sqlite3 (stdlib). Multi-stage Dockerfile.
- **Frontend**: React 18 + Vite + TypeScript + Tailwind + Recharts. Bygget statisk og servert av FastAPI.
- **Data**: SQLite på en navngitt volume (`fleet-data`) så data overlever container-restart.
- **Auth**: Tokens injiseres som Basic Auth i HTTPS-URL-en for git clone.

## Utvikling utenfor Docker

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
FLEET_DATA_DIR=$(pwd)/../data uvicorn altinn_fleet.main:app --reload

# Frontend
cd ../frontend
yarn install
yarn dev   # på http://localhost:5173, proxyer /api → :9091
```

## Databaseutforskning

Enkleste vei: bruk **Query-fanen** i UI — ferdig oppsett med autocomplete på tabeller/kolonner og kjør SQL direkte mot databasen for valgt miljø.

For rå tilgang kan SQLite-fila åpnes direkte:

```bash
docker compose exec fleet sqlite3 /data/fleet-prod.sqlite
```

Skjemaet ligger i `backend/altinn_fleet/db.py`. Hovedtabeller:

- `apps` — én rad per app, med backend-versjon, hash, telleverk
- `layouts` — én per layout-fil
- `components` — én per komponent, med type, optionsId, hidden-flagg, raw_props (JSON)
- `component_props` — én per komponent × prop-nøkkel
- `settings_keys` — alle nøkler i `Settings.json` og `applicationmetadata.json`
- `bpmn_tasks` — én per task i `process.bpmn`
- `languages` — én per app × språkkode
- `interfaces` — katalogen over offentlige grensesnitt i Altinn.App-bibliotekene
- `app_interfaces` — én rad per app × grensesnitt × brukstype (`implements`/`registers`/`injects`)

## Begrensninger / TODO

- Henter kun apper som er aktivt deployet via `kuberneteswrapper/api/v1/deployments`. Apper som er publisert men ikke deployet til den valgte env vises ikke.
- Layouts som lastes dynamisk via expressions kan ikke fullt ut spores statisk — `in_pages_order` heuristikken sjekker `Settings.json` `pages.order`/`pages.groups[].order`.
- Grensesnitt-bruk leses med regexer over C#-koden, ikke med en kompilator — appene i flåten spenner over alle bibliotekversjoner og bygger ikke i denne containeren. Kall via refleksjon eller kodegenerering fanges derfor ikke opp.
- Arv gjennom bibliotekets egne baseklasser løses, men ikke arvekjeder som går via appens egne mellomklasser (`class A : GenericFormDataValidator<T>`, `class B : A` — bare `A` telles).
- Katalogen beskriver den bibliotekversjonen imaget ble bygget fra. Apper på eldre versjoner kan bruke grensesnitt som er fjernet siden — de dukker opp under «Grensesnitt utenfor katalogen».
- Schema-migrasjoner: ny versjon dropper bare alle tabeller når skjemaet endres. Egnet for tidlige iterasjoner: det er OK for en app som dette.

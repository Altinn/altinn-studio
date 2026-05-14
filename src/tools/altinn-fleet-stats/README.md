# Altinn Studio Fleet Statistics

Statistikk-dashboard over Altinn 3-apper i prod og tt02. Henter klonene, parser strukturen, lagrer i SQLite og viser det i nettleseren.

Kjøres som én Docker-container. UX-teamet kan starte den lokalt og klikke seg fram til svar uten å røre terminalen.

## Kom i gang

```bash
# Bygg og start
docker compose up -d --build

# Åpne dashbordet
open http://localhost:8080
```

### Installer som app på Mac

Verktøyet er en PWA — kan installeres som standalone app:

**Chrome / Edge:**

1. Åpne http://localhost:8080
2. Trykk install-ikonet i adresselinjen (eller ⋮ → "Install Altinn Studio Fleet Statistics…")
3. App'en dukker opp i Launchpad og kan startes som vanlig app

**Safari (macOS Sonoma+):**

1. Åpne http://localhost:8080
2. Fil → Legg til i Dock

App'en kjører i et eget vindu uten browser-chrome. Docker-container må fortsatt være oppe i bakgrunnen siden den er datakilden — `docker compose up -d` overlever maskin-restart hvis du har Docker Desktop satt til å starte automatisk.

I dashbordet:

1. Klikk **Hent apper** — laster ned (eller oppdaterer) alle klonede apper for valgt miljø
2. Klikk **Re-analyser** — parser appene og oppdaterer databasen
3. Bla gjennom fanene (Oversikt / Komponenter / Innstillinger / Språk / Prosess / Søk)

Begge operasjonene er idempotente — trygt å kjøre igjen. Re-analyse skipper apper som ikke har endret seg.

## Konfigurasjon

All konfigurasjon gjøres i UI under fanen **Konfigurasjon** — miljøvalg (prod/tt02), git-credentials og concurrency-innstillinger. Endringer lagres og trer i kraft uten å restarte containeren.

## Bytte mellom prod og tt02

Hver miljø får sin egen klone- og database-mappe under volumet:

```
/data/
├── apps-prod/        ← klonede prod-apper
├── apps-tt02/        ← klonede tt02-apper
├── fleet-prod.sqlite ← database for prod
├── fleet-tt02.sqlite ← database for tt02
└── .cache/           ← API-cache (1 t TTL)
```

For å bytte: sett `FLEET_ENV=tt02` i `.env`, kjør `docker compose up -d`, og klikk **Hent apper** for å fylle den.

## Arkitektur

```
┌────────────────────────────────────────┐
│ Docker container (localhost:8080)      │
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
yarn dev   # på http://localhost:5173, proxyer /api → :8080
```

## Databaseutforskning

SQLite-fila er rå og kan åpnes direkte:

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

## Begrensninger / TODO

- Henter kun apper som er aktivt deployet via `kuberneteswrapper/api/v1/deployments`. Apper som er publisert men ikke deployet til den valgte env vises ikke.
- Layouts som lastes dynamisk via expressions kan ikke fullt ut spores statisk — `in_pages_order` heuristikken sjekker `Settings.json` `pages.order`/`pages.groups[].order`.
- Schema-migrasjoner: ny versjon dropper bare alle tabeller når skjemaet endres. Egnet for tidlige iterasjoner: det er OK for en app som dette.

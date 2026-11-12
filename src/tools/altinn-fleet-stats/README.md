# Altinn Studio Fleet Statistics

_Denne README-en er på norsk fordi UX-teamet leser den._

Statistikk-dashbord over Altinn 3-appene som kjører i prod og tt02. UX-teamet kjører det lokalt for å svare på
spørsmål om hvordan appene faktisk er bygget, uten å røre terminalen.

Dashbordet spør hver tjenesteeiers `kuberneteswrapper` hvilke apper som er deployet og i hvilken versjon. Så kloner
det appene fra altinn.studio, eller fra dev.altinn.studio når versjonen bare finnes der, parser strukturen og lagrer
resultatet i SQLite. Backenden er FastAPI og serverer også React-frontenden, alt i én Docker-container.

## Kom i gang

```sh
docker compose up -d --build
open http://localhost:9091
```

I dashbordet klikker du **Hent apper** for å klone eller oppdatere appene i valgt miljø, og **Re-analyser** for å
parse dem og oppdatere databasen. Begge kan kjøres på nytt, og re-analysen hopper over apper som ikke har endret seg.

Innstillingene i fanen **Konfigurasjon**, som miljø, Git-tilgang og samtidighet, lagres i volumet og overstyrer
standardverdiene i [`docker-compose.yml`](docker-compose.yml). De gjelder uten omstart. Hvert miljø har sin egen
klonemappe og database i volumet, så du kan bytte mellom prod og tt02 uten å miste dataene fra det andre.

Fanen **Query Tools** kjører SQL mot databasen for valgt miljø. Skjemaet står i
[`db.py`](backend/altinn_fleet/db.py).

Dashbordet kan installeres som app fra nettleseren, men containeren må kjøre.

## Grensesnitt-fanen

Fanen **Grensesnitt** viser hvilke offentlige grensesnitt Altinn.App-bibliotekene tilbyr, og hvor mange apper som
bruker hvert av dem. Scanneren leser appenes egen C#-kode og skiller mellom tre former for bruk: appen implementerer
grensesnittet, registrerer det i DI, eller injiserer det.

En app som arver en av bibliotekets baseklasser, som `GenericFormDataValidator<T>`, implementerer
`IFormDataValidator` uten å nevne det. Katalogen har derfor også bibliotekets klasser og grensesnittene de
implementerer, og scanneren løser arven transitivt. Den løser ikke arv gjennom appens egne mellomklasser. Med
`class A : GenericFormDataValidator<T>` og `class B : A` telles bare `A`.

**Grensesnitt utenfor katalogen** er grensesnitt som apper implementerer, men som ikke finnes i dagens bibliotek.
Som regel er de fjernet, og appene står på en eldre versjon.

### Oppdatere katalogen

[`generate_interface_catalog.py`](backend/scripts/generate_interface_catalog.py) bygger
[`interface_catalog.json`](backend/altinn_fleet/data/interface_catalog.json) fra de innsjekkede public-API-snapshotene
til [app-bibliotekene](../../App/backend) og XML-dokumentasjonen i kildekoden. Filen er sjekket inn og følger med i
imaget, så dashbordet virker uten resten av repoet.

Ingen CI-jobb sjekker at katalogen er oppdatert. Kjør generatoren når bibliotekenes offentlige API endrer seg:

```sh
python3 backend/scripts/generate_interface_catalog.py
```

`--check` feiler når den innsjekkede katalogen er utdatert. Bygg imaget på nytt etterpå og kjør **Re-analyser**, siden
analysen fyller databasen fra katalogen.

## Utvikling utenfor Docker

```sh
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
FLEET_DATA_DIR=$(pwd)/../data uvicorn altinn_fleet.main:app --reload

# Frontend
cd ../frontend
yarn install
yarn dev   # http://localhost:5173, sender /api videre til :9091
```

Appene i flåten spenner over alle bibliotekversjoner tilbake til den første Altinn 3-versjonen, og de bygger ikke i
containeren. Derfor leser [`csharp.py`](backend/altinn_fleet/csharp.py) C#-koden med regulære uttrykk i stedet for en
kompilator. Parseren må tåle strukturer den ikke kjenner, heller enn å være presis. Når du legger til et nytt signal,
sammenlign det med antall DI-registreringer. Et grensesnitt som registreres langt oftere enn det implementeres, tyder
på at parseren går glipp av en form.

## Begrensninger

- Dashbordet ser bare apper som er deployet i valgt miljø. Apper som er publisert men ikke deployet, vises ikke.
- Layouts som lastes dynamisk via expressions kan ikke spores statisk. En side regnes som i bruk når den står i
  `pages.order` eller `pages.groups[].order` i `Settings.json`.
- Kall via refleksjon eller kodegenerering fanges ikke opp, siden scanneren ikke kompilerer koden.
- En eksisterende database får bare nye tabeller og de nye kolonnene som `_migrate` i `db.py` legger til. Andre
  skjemaendringer krever at databasefilen i volumet slettes.

# Run sheet — v9 town hall

One page for the person holding the clicker. Structure in English, the spoken notes verbatim in
norsk bokmål (they are the `notes` fields in `src/slides/index.ts`, which is the source of truth).

**The talk is slides 1–14: 44 build steps, 57 presses of `→` from the opening slide to the
last.** Slides 15–22 are reserve slides for questions, reached with `o`.

Start: `npm run build && npm run preview`, open <http://localhost:4173> in Chrome, press `f`.

---

## Keyboard

| Key                    | Action                                            |
| ---------------------- | ------------------------------------------------- |
| `→` / `Space` / `PgDn` | Next build step, then next slide                  |
| `←` / `PgUp`           | Previous build step, then previous slide          |
| `↓` / `↑`              | Skip a whole slide, ignoring its build steps      |
| `Home` / `End`         | First slide / last reserve slide                  |
| `F`                    | Fullscreen                                        |
| `O`                    | Overview grid — click a thumbnail to jump         |
| `?`                    | This cheat sheet, on screen                       |
| `Esc`                  | Close an overlay                                  |

Going backwards is safe: `←` re-enters a slide fully built. Deep-link during a rehearsal with `#/9`
(slide 9) or `#/9/7` (slide 9, build step 7).

---

## The two scenarios (slides 9 and 10)

Each one is clicked through, one line per press: **14 presses** per scenario.

| Presses | On stage                                                                 |
| ------- | ------------------------------------------------------------------------ |
| 1–6     | **I dag (v8)**: one line per press, and Kari's phone changes with them    |
| 7       | The stage resets under **Med v9**: the same accident again                |
| 8–13    | The v9 telling, one line per press                                        |
| 14      | Both outcomes side by side, and the closing sentence                      |

Talk over each line; the lines are short on purpose. On press 7, say «samme situasjon, med v9».

---

## Do not overclaim

1. **Never «nøyaktig én gang».** The engine is at-least-once. Say «det som er fullført, kjøres ikke
   på nytt», or «ingenting ble gjort to ganger» about the run on screen.
2. **The engine is mandatory in v9, not a feature you switch on.** Do not offer it as opt-in.
3. **v9 is a closed beta.** The slides say «vi tar inn pilotapper nå»; if asked, it is internal
   for now and opened to more organisations as needed. Never «oppgrader i dag».
4. **The frontend is not a rebuild,** and the only speed figure is one early measurement in a test
   app. Never «mye raskere».
5. **Much of the platform work already reaches v8 apps.** The footnote on slide 3 says so.
6. **The admin-page status is «på vei»,** not something that exists today.
7. **Never name an archive-system vendor.** Say *arkivintegrasjon* / *arkivsystem*.

---

## Slide by slide

### 1 — Hva blir bedre med v9? · 2 clicks

> Tre deler: plattformen appene kjører på, det brukerne ser, og det appen gjør bak kulissene. Vi avslutter med hvordan dere kan bli med som pilot.

### 2 — Del 1 — Infrastruktur · 0 clicks

> Del 1: plattformen.

### 3 — Nytt med v9 · 1 click

> Plattformen tar mer av jobben: prosessmotoren, én fast Maskinporten-identitet per app, og myke omstarter der det som pågår får bli ferdig. Siste klikk: det som er på vei — status fra prosessmotoren rett i adminsidene i Studio. Den er ikke ute ennå; si «på vei». Linja nederst er ærlig ment: utrulling, Maskinporten-klienten (fra 8.3.0), PDF-tjenesten og varslene har v8-appene også fått.

### 4 — Del 2 — Frontend · 0 clicks

> Del 2: det brukerne ser.

### 5 — Raskere, og levert med appen · 1 click

> Frontend har fått ny arkitektur under panseret: hver side henter dataene sine og husker dem, og det appen trenger for å starte, kommer i første svar. Og i v9 ligger frontend i appen, så det du tester er det brukerne får — i v8 henter appen alltid nyeste versjon. Tallet er én måling i et skjema med 32 sider; si det om noen spør. Ikke si «bygget på nytt».

### 6 — Det brukerne merker · 0 clicks

> Fire ting brukerne merker. Rolig venting med beskjed om at det er trygt å lukke siden etter åtte sekunder. Samme status om siden lastes på nytt. Ingen tapte svar. Og en feilliste som ikke roper før brukeren prøver å gå videre.

### 7 — Del 3 — Backend · 0 clicks

> Del 3: det appen gjør bak kulissene — prosessene, stegene og logikken. «Send inn» er bare det mest kjente eksempelet.

### 8 — Ett klikk, ti ting · 2 clicks

> Ett klikk på «Send inn» setter i gang ti ting, og i v8 må alle lykkes mens brukeren venter på svar. Andre klikk: i v9 lagrer plattformen hvert av dem og gjør dem ferdig. Feiler noe, prøves det igjen, og det som er fullført, kjøres ikke på nytt. Si aldri «nøyaktig én gang». Vi skal se to eksempler.

### 9 — Scenario 1: Noe feiler under innsending · plays through in 14 presses

> Samme uhell to ganger. Først v8: Kari blir stående på samme side med en feilmelding, må prøve igjen selv, og da kjøres alt fra starten — for eksempel blir PDF-en laget to ganger. Så v9: Kari ser at arbeidet fortsetter, plattformen prøver igjen selv, og bare steget som feilet kjøres på nytt. Til slutt: de to utfallene side om side.

### 10 — Scenario 2: Serveren startes på nytt · plays through in 14 presses

> Dette skjer hver gang en ny versjon rulles ut. I v8 stopper arbeidet midt i: PDF-en er laget, resten er ikke gjort, og ingen vet hvor langt det kom. I v9 er hvert steg lagret, så arbeidet fortsetter der det stoppet når serveren er tilbake. Kari merker bare litt venting.

### 11 — Nye muligheter for utviklere · 3 clicks

> For dere som bygger apper: tjenesteoppgaver kan deles i steg som hver lagres når de er ferdige. En oppgave kan vente i timer eller dager på svar fra et annet system. Oppgaven er sitt eget ventesteg, så et eget «feedback»-steg trengs ikke lenger. Og dere kan selv velge hvor lenge et steg skal prøves igjen.

### 12 — Vi kan se hva som skjer · 3 clicks

> Dashbordet viser prosesser som pågår, tid brukt per steg, nedtelling til neste forsøk og hele feilhistorikken. Derfra kan drift kjøre et steg på nytt, be det sjekke nå, eller gi opp.

### 13 — Hva koster oppgraderingen? · 1 click

> Prosessfilen i malen er lik i v8 og v9. Oppgraderingsverktøyet skriver om det det kan, og peker ut tre ting dere gjør selv: tilganger appen bruker selv, arkivoppgaver, og ventesteg som ikke lenger trengs. Prosessmotoren er en fast del av v9, ikke noe man skrur av eller på.

### 14 — Bli med i pilotene · 3 clicks

> Vi tar inn pilotapper nå. Om noen spør: v9 er i lukket beta, foreløpig internt, og vi åpner for flere organisasjoner etter hvert som dere melder dere. Vi hjelper med oppgraderingen. Slutt her — reserveslidene etter denne er for spørsmål.

---

## Reserve (for questions)

### 15 — Reserve — Under panseret · 0 clicks

> Reserve. Bruk `o` for å hoppe hit ved spørsmål om hvordan v8 gjør det i dag, eller hvordan motoren er bygget.

### 16 — Reserve: Slik ser det ut i dag · 2 clicks

> Rekkefølgen er en rett linje med «await» etter «await». Det finnes ingen transaksjon rundt den, og ingenting som rydder opp hvis linjen brytes på midten.

### 17 — Reserve: Alt henger i én tråd · 2 clicks

> Dette er kjernen. Det er ikke at koden er dårlig — den er god. Det er at arbeidet bare eksisterer i minnet til én prosess, i den tiden nettleseren holder forbindelsen åpen.

### 18 — Reserve: Når det ryker midtveis · 2 clicks

> Sideeffektene kjørte før prosessteget ble lagret. Det betyr at vi kan sitte igjen med halvt utført arbeid som ingen vet om. Neste forsøk begynner helt forfra.

### 19 — Reserve: Dobbeltinnsending · 3 clicks

> Fra v8.11 kom det en lås mot Storage, og den hjelper mot samtidige klikk. Men den er en leie med fem minutters levetid, og det finnes ingen nøkkel som gjenkjenner at «dette er det samme forsøket én gang til».

### 20 — Reserve: Halvveis utført · 4 clicks

> Registrering mot hendelsestjenesten var pakket inn i en logglinje — feilet den, gikk den tapt uten spor. Og en forsendelse som feiler halvveis, kan allerede ha lastet opp vedlegg på den andre siden. Siste klikk: dobbeltklikk. Låsen fra v8.11 stopper to samtidige klikk, men kjenner ikke igjen det samme forsøket én gang til — det gjør idempotensnøkkelen i v9.

### 21 — Reserve: Driftshverdagen · 2 clicks

> Den lange ventingen på leveransebekreftelse var bygget på at app-en sendte en hendelse til seg selv og lånte en annen tjenestes forsøksrytme som klokke. Gikk tiden ut, måtte noen tømme en kø for hånd.

### 22 — Reserve: En motor for prosessen · 3 clicks

> App-en melder inn hva som skal skje og får svar. Motoren skriver hvert steg til Postgres, kjører dem i rekkefølge, og kaller tilbake til app-en for hvert steg. Databasen er fasit — ingen kø i minnet.

---

## If something goes wrong

- **You lost your place.** `O` for the overview and click the slide, or `Home` and `↓` your way
  back.
- **The window is the wrong shape.** The deck letterboxes itself; nothing is cut off, there will
  just be bars. `f` for fullscreen.

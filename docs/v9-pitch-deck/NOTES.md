# Run sheet — v9 town hall

One page for the person holding the clicker. Structure in English, the spoken notes verbatim in
norsk bokmål (they are the `notes` fields in `src/slides/index.ts`, which is the source of truth).

**The talk is slides 1–16: 47 build steps, 62 presses of `→` from the opening slide to the
last.** Slides 17–24 are reserve slides for questions, reached with `o`.

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

Going backwards is safe: `←` re-enters a slide fully built. Deep-link during a rehearsal with `#/11`
(slide 11) or `#/11/7` (slide 11, build step 7).

---

## The two scenarios (slides 11 and 12)

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
3. **v9 is a closed beta.** Internal for now, opened to more organisations as needed. Never
   «oppgrader i dag».
4. **The frontend is not a rebuild,** and the only speed figure is one early measurement in a test
   app. Never «mye raskere».
5. **Most of the infrastructure slide already reaches v8 apps.** Say so; the room will know.
6. **The admin-page status is «kommer»,** not something that exists today.
7. **Never name an archive-system vendor.** Say *arkivintegrasjon* / *arkivsystem*.

---

## Slide by slide

### 1 — Ett klikk, mange ting · 1 click

> Dette er utgangspunktet. Ett klikk på «Send inn» setter i gang ti ting, og i v8 må alle ti lykkes mens brukeren venter på svar. I dag skal vi se hva som blir bedre med v9 — på plattformen, i det brukerne ser, og i det som skjer etter klikket.

### 2 — Hva blir bedre med v9? · 2 clicks

> Tre deler. Først plattformen appene kjører på, så frontend — det brukerne ser — og til slutt backend, som er det som skjer etter «Send inn». Vi avslutter med hvordan dere kan bli med.

### 3 — Del 1 — Infrastruktur · 0 clicks

> Del 1: plattformen.

### 4 — Allerede bedre — også for v8-apper · 0 clicks

> Vær ærlig her: mye av det som er bedre på plattformen, har v8-appene allerede fått. Utrulling følges til den er ferdig, Maskinporten-klienten lages og roteres av plattformen — fra 8.3.0 — alle PDF-er lages av den nye tjenesten, og tjenesteeiere kan få varsler. Det er ikke noe dere må oppgradere for.

### 5 — Nytt med v9 · 1 click

> Dette krever v9: prosessmotoren, som vi kommer tilbake til, én fast Maskinporten-identitet per app, og myke omstarter der det som pågår får bli ferdig. Siste klikk: det som kommer — status fra prosessmotoren rett i adminsidene i Studio. Si «kommer», ikke «finnes».

### 6 — Del 2 — Frontend · 0 clicks

> Del 2: det brukerne ser.

### 7 — Frontend følger appen · 1 click

> Den største endringen er ikke hvordan frontend ser ut, men hvordan den kommer ut. I v8 henter appen alltid nyeste versjon, så brukerne kan få noe du ikke har testet. I v9 ligger frontend i appen. Tallet er én tidlig måling i en testapp med 32 sider — si det sånn, ikke «mye raskere».

### 8 — Det brukerne merker · 0 clicks

> Fire ting brukerne merker. Rolig venting med beskjed om at det er trygt å lukke siden etter åtte sekunder. Samme status om siden lastes på nytt. Ingen tapte svar. Og en feilliste som ikke roper før brukeren prøver å gå videre.

### 9 — Del 3 — Backend · 0 clicks

> Del 3: det som skjer etter «Send inn».

### 10 — Arbeidet skrives ned før det gjøres · 3 clicks

> Dette er hele ideen i én setning. Hvert steg etter «Send inn» lagres av plattformen og følges opp til det er ferdig. Feiler noe, prøves det igjen. Det som er fullført, kjøres ikke på nytt. Og alt kan ses. Vi skal se to eksempler.

### 11 — Scenario 1: Noe feiler under innsending · plays through in 14 presses

> Samme uhell to ganger. Først v8: Kari blir stående på samme side med en feilmelding, må prøve igjen selv, og da kjøres alt fra starten — for eksempel blir PDF-en laget to ganger. Så v9: Kari ser at arbeidet fortsetter, plattformen prøver igjen selv, og bare steget som feilet kjøres på nytt. Til slutt: de to utfallene side om side.

### 12 — Scenario 2: Serveren startes på nytt · plays through in 14 presses

> Dette skjer hver gang en ny versjon rulles ut. I v8 stopper arbeidet midt i: PDF-en er laget, resten er ikke gjort, og ingen vet hvor langt det kom. I v9 er hvert steg lagret, så arbeidet fortsetter der det stoppet når serveren er tilbake. Kari merker bare litt venting.

### 13 — Nye muligheter for utviklere · 3 clicks

> For dere som bygger apper: tjenesteoppgaver kan deles i steg som hver lagres når de er ferdige. En oppgave kan vente i timer eller dager på svar fra et annet system. Oppgaven er sitt eget ventesteg, så et eget «feedback»-steg trengs ikke lenger. Og dere kan selv velge hvor lenge et steg skal prøves igjen.

### 14 — Vi kan se hva som skjer · 3 clicks

> Dashbordet viser innsendinger som pågår, tid brukt per steg, nedtelling til neste forsøk og hele feilhistorikken. Derfra kan drift kjøre et steg på nytt, be det sjekke nå, eller gi opp.

### 15 — Hva koster oppgraderingen? · 2 clicks

> Prosessfilen i malen er lik i v8 og v9. Oppgraderingsverktøyet skriver om det det kan, og peker ut tre ting dere gjør selv: tilganger appen bruker selv, arkivoppgaver, og ventesteg som ikke lenger trengs. Vi hjelper med resten.

### 16 — Bli med i pilotene · 3 clicks

> Vær ærlig her: v9 er i lukket beta, foreløpig internt, og det er nettopp derfor vi spør nå. Vi åpner for flere organisasjoner etter hvert som dere melder dere, og vi hjelper med oppgraderingen. Slutt her — reserveslidene etter denne er for spørsmål.

---

## Reserve (for questions)

### 17 — Reserve — Under panseret · 0 clicks

> Reserve. Bruk `o` for å hoppe hit ved spørsmål om hvordan v8 gjør det i dag, eller hvordan motoren er bygget.

### 18 — Reserve: Slik ser det ut i dag · 2 clicks

> Rekkefølgen er en rett linje med «await» etter «await». Det finnes ingen transaksjon rundt den, og ingenting som rydder opp hvis linjen brytes på midten.

### 19 — Reserve: Alt henger i én tråd · 2 clicks

> Dette er kjernen. Det er ikke at koden er dårlig — den er god. Det er at arbeidet bare eksisterer i minnet til én prosess, i den tiden nettleseren holder forbindelsen åpen.

### 20 — Reserve: Når det ryker midtveis · 2 clicks

> Sideeffektene kjørte før prosessteget ble lagret. Det betyr at vi kan sitte igjen med halvt utført arbeid som ingen vet om. Neste forsøk begynner helt forfra.

### 21 — Reserve: Dobbeltinnsending · 3 clicks

> Fra v8.11 kom det en lås mot Storage, og den hjelper mot samtidige klikk. Men den er en leie med fem minutters levetid, og det finnes ingen nøkkel som gjenkjenner at «dette er det samme forsøket én gang til».

### 22 — Reserve: Halvveis utført · 4 clicks

> Registrering mot hendelsestjenesten var pakket inn i en logglinje — feilet den, gikk den tapt uten spor. Og en forsendelse som feiler halvveis, kan allerede ha lastet opp vedlegg på den andre siden. Siste klikk: dobbeltklikk. Låsen fra v8.11 stopper to samtidige klikk, men kjenner ikke igjen det samme forsøket én gang til — det gjør idempotensnøkkelen i v9.

### 23 — Reserve: Driftshverdagen · 2 clicks

> Den lange ventingen på leveransebekreftelse var bygget på at app-en sendte en hendelse til seg selv og lånte en annen tjenestes forsøksrytme som klokke. Gikk tiden ut, måtte noen tømme en kø for hånd.

### 24 — Reserve: En motor for prosessen · 3 clicks

> App-en melder inn hva som skal skje og får svar. Motoren skriver hvert steg til Postgres, kjører dem i rekkefølge, og kaller tilbake til app-en for hvert steg. Databasen er fasit — ingen kø i minnet.

---

## If something goes wrong

- **You lost your place.** `O` for the overview and click the slide, or `Home` and `↓` your way
  back.
- **The window is the wrong shape.** The deck letterboxes itself; nothing is cut off, there will
  just be bars. `f` for fullscreen.

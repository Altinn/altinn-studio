# Run sheet: v9 town hall

One page for the person holding the clicker. Structure in English, the spoken notes verbatim in
norsk bokmål (they are the `notes` fields in `src/slides/index.ts`, which is the source of truth).

**15 slides, 24 build steps, 38 presses of `→` from the opening slide to the last.**

Start: `npm run build && npm run preview`, open <http://localhost:4173> in Chrome, press `f`.

---

## Keyboard

| Key                    | Action                                            |
| ---------------------- | ------------------------------------------------- |
| `→` / `Space` / `PgDn` | Next build step, then next slide                  |
| `←` / `PgUp`           | Previous build step, then previous slide          |
| `↓` / `↑`              | Skip a whole slide, ignoring its build steps      |
| `Home` / `End`         | First / last slide                                |
| `F`                    | Fullscreen                                        |
| `O`                    | Overview grid; click a thumbnail to jump          |
| `?`                    | This cheat sheet, on screen                       |
| `Esc`                  | Close an overlay                                  |

Going backwards is safe: `←` re-enters a slide fully built. Tile slides need no clicks: their tiles
enter on their own as the slide arrives. Deep-link during a rehearsal with `#/12`
(slide 12) or `#/12/7` (slide 12, build step 7).

---

## The two scenarios (slides 12 and 13)

Each one is clicked through: **7 presses** per scenario. **Med v8** is on the left and **Med
v9** on the right, and each press lands the next line on **both** sides at once, so row 3 on the
left always sits next to row 3 on the right.

| Presses | On stage                                                                  |
| ------- | ------------------------------------------------------------------------- |
| 1–6     | One more line on each side, and Kari's two phones change with them        |
| 7       | Both outcomes side by side, and the closing sentence                      |

Read the left line, then the right one. The lines are short on purpose.

---

## Do not overclaim

1. **Never «nøyaktig én gang».** The engine is at-least-once. Say «det som er fullført, kjøres ikke
   på nytt», or «ingenting ble gjort to ganger» about the run on screen.
2. **The engine is mandatory in v9, not a feature you switch on.** Do not offer it as opt-in.
3. **v9 is in open beta, and the upgrade runs from Studio.** Both are planned before the talk;
   check that they happened. Never «ferdig» or «oppgrader i produksjon i dag».
4. **The frontend is not a rebuild,** and the only speed figure is one early measurement in a test
   app. Never «mye raskere».
5. **Much of the platform work already reaches v8 apps.** The footnote on slide 3 says so.
6. **The admin-page status is stated as fact.** It is merged before the talk; check that it was.
7. **Never name an archive-system vendor.** Say *arkivintegrasjon* / *arkivsystem*.

---

## Slide by slide

### 1. Hva blir bedre med v9? · 0 clicks

> Tre deler: plattformen appene kjører på, det brukerne ser, og det appen gjør bak kulissene. Vi avslutter med hvordan dere kommer i gang.

### 2. Del 1: Infrastruktur · 0 clicks

> Del 1: plattformen.

### 3. Nytt med v9 · 0 clicks

> Plattformen tar mer av jobben. Prosessmotoren gjør at prosessene tåler feil: hvert steg lagres og gjøres ferdig, også når noe feiler. Plattformen lager Maskinporten-klienten og tar seg av den. Og adminsidene i Studio viser hvilke prosesser som står fast, og lar dere starte dem igjen. Banneret nederst er ærlig ment: utrulling, PDF-tjenesten og varslene har v8-appene også fått. Om noen spør: den plattformstyrte Maskinporten-klienten finnes for v8-apper fra 8.3.0, men i v9 er den den eneste måten.

### 4. Del 2: Frontend · 0 clicks

> Del 2: det brukerne ser.

### 5. Raskere og i takt med appen · 1 click

> Frontend har fått ny arkitektur under panseret: hver side henter dataene sine og husker dem, og det appen trenger for å starte, kommer i første svar. Tallene kommer fra én måling i et skjema med 32 sider. Si det hvis noen spør, og ikke si «bygget på nytt». Andre klikk: i v9 ligger frontend i samme pakke som appen. Appen din er backend, altså Altinn-bibliotekene og deres egen kode, pluss frontend, og alt har samme versjon. I v8 henter appen alltid nyeste frontend, så brukerne kan få en versjon du ikke har testet. Nå er den versjonen du tester, den samme som brukerne får.

### 6. Brukeropplevelsen · 0 clicks

> Fire ting brukerne merker. Tydelig venting, med beskjed om at det er trygt å lukke siden etter åtte sekunder. Status som varer: laster brukeren siden på nytt, vises samme status som før. Ingen tapte svar. Og en feilliste som vises først når brukeren prøver å gå videre.

### 7. Del 3: Backend · 0 clicks

> Del 3: det appen gjør bak kulissene, altså prosessene, stegene og logikken. «Send inn» er bare det mest kjente eksempelet.

### 8. En motor for prosessene · 3 clicks

> Dette er hele ideen. Appen sier hva som skal skje, og prosessmotoren sørger for at det blir gjort. Hvert steg lagres før det gjøres, så en feil eller en omstart underveis ikke betyr at noe går tapt. Det gjelder alle overganger i prosessen, ikke bare «Send inn».

### 9. Nye muligheter for utviklere · 0 clicks

> For dere som bygger apper: tjenesteoppgaver kan deles i steg som hver lagres når de er ferdige. En oppgave kan vente i timer eller dager på svar fra et annet system. Oppgaven er sitt eget ventesteg, så et eget «feedback»-steg trengs ikke lenger. Og dere kan selv velge hvor lenge et steg skal prøves igjen.

### 10. Vi kan se hva som skjer · 3 clicks

> Dashbordet viser prosesser som pågår, tid brukt per steg, nedtelling til neste forsøk og hele feilhistorikken. Derfra kan drift kjøre et steg på nytt, be det sjekke nå, eller gi opp.

### 11. Ett klikk, ti ting · 2 clicks

> Nå et eksempel alle kjenner. Ett klikk på «Send inn» setter i gang ti ting, og i v8 må alle lykkes mens brukeren venter på svar. Andre klikk: i v9 lagres hvert av dem og gjøres ferdig. Feiler noe, prøves det igjen, og det som er fullført, kjøres ikke på nytt. Si aldri «nøyaktig én gang». Så to scenarier.

### 12. Scenario 1: Noe feiler under innsending · plays through in 7 presses

> Samme uhell to ganger. Først v8: Kari blir stående på samme side med en feilmelding, må prøve igjen selv, og da kjøres alt fra start. PDF-en blir for eksempel laget to ganger. Så v9: Kari ser at arbeidet fortsetter, plattformen prøver igjen selv, og bare steget som feilet kjøres på nytt. Til slutt: de to utfallene side om side.

### 13. Scenario 2: Serveren startes på nytt · plays through in 7 presses

> Dette skjer hver gang en ny versjon rulles ut. I v8 stopper arbeidet midt i: PDF-en er laget, resten er ikke gjort, og ingen vet hvor langt det kom. I v9 er hvert steg lagret, så arbeidet fortsetter der det stoppet når serveren er tilbake. Kari merker bare litt venting.

### 14. Slik oppgraderer du til v9 · 1 click

> Prosessfilen i malen er lik i v8 og v9. Oppgraderingen kjøres rett fra Studio, eller med studioctl. Verktøyet skriver om navn og navnerom, gjør PDF og forsendelse om til tjenesteoppgaver og legger til tilgangene appen trenger. To ting viser det at dere må gjøre for hånd: skrive om egen kode i prosessteg, og fjerne ventesteg som ikke lenger trengs. Prosessmotoren er en fast del av v9, ikke noe man skrur av eller på.

### 15. Kom i gang med v9 · 0 clicks

> v9 er i åpen beta, og alle kan oppgradere selv, rett fra Studio eller med studioctl. Rull ut til test og prøv som vanlig, og si fra hva som skurrer. Trenger dere hjelp, tar vi det gjerne.

---

## If something goes wrong

- **You lost your place.** `O` for the overview and click the slide, or `Home` and `↓` your way
  back.
- **The window is the wrong shape.** The deck letterboxes itself; nothing is cut off, there will
  just be bars. `f` for fullscreen.

# Run sheet — v8 → v9 town hall

One page for the person holding the clicker. Structure in English, the spoken notes verbatim in
norsk bokmål (they are the `notes` fields in `src/slides/index.ts`, which is the source of truth).

**14 slides · 27 build steps · 40 presses of `→` from the opening slide to the last.**

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
| `O`                    | Overview grid — click a thumbnail to jump         |
| `?`                    | This cheat sheet, on screen                       |
| `Esc`                  | Close an overlay                                  |

Going backwards is safe: `←` re-enters a slide fully built, and the three simulations start over from
the beginning every time you arrive on them — nothing carries over from the run you just did.

Deep-link during a rehearsal with `#/5` (slide 5) or `#/5/2` (slide 5, build step 2).

---

## The three simulations (slides 9, 10, 11)

They are **not** clicked through. Each one plays itself the moment you arrive and then parks on its
end state; `→` moves on to the next slide whenever you are ready.

All three look the same on purpose: one sentence and one icon on top saying what goes wrong, **I dag
(v8)** left and **Med prosessmotor (v9)** right, each column showing one person's screen and, under
it, the short list of what happens to them — and one closing sentence. The rows are identical on both
sides until the story splits, and after that the left turns gold/red while the right stays blue/green.

| Key / gesture              | On a simulation slide                                  |
| -------------------------- | ------------------------------------------------------ |
| `Space`                    | Pause / resume. Once it has finished, plays it again    |
| `R`                        | Play from the beginning                                 |
| click anywhere on the scene| Same as `Space` — no small target to hit in the dark    |
| click a marker on the rail | Jump the run to that beat («can you show that bit again?») |
| `→` / `←`                  | Still the deck: leave the slide, or step back off it    |

**`Space` belongs to the scene here, not to the deck** — it pauses instead of advancing. Use `→` to
move on, on these three slides.

| Slide             | Plays for                   | The six beats                                                                                            |
| ----------------- | --------------------------- | -------------------------------------------------------------------------------------------------------- |
| 9 · Innbyggeren   | ~12,5 s, then holds (~15 s) | Kari trykker Send inn · Serveren restarter · Det Kari ser · Hvem rydder opp · Ingenting gjøres dobbelt · Utfallet |
| 10 · Mottakeren   | ~12,5 s, then holds (~15 s) | Forsendelsen ut · Mottakeren svarer ikke · Det brukeren merker · Venting er ikke feil · Nytt forsøk · Bekreftet |
| 11 · Driftsvakta  | ~12,6 s, then holds (~15 s) | Steget feiler · Vakttelefonen ringer · Leter i loggene · Hvor mange står fast · Kjør på nytt · Utfallet    |

A beat lands every ~2,2 s. Each one ends on a single takeaway sentence and holds there until you
press `→` — roughly twenty seconds of talking room per simulation, and the speaker note below each
one is written to fill it.

---

## Do not overclaim

Three things to keep out of your mouth, and what to say instead.

1. **Never «nøyaktig én gang».** The engine is at-least-once with retries and idempotency; a step
   *can* run twice (a crash between the callback and the write-back). Say **«ingen dupliserte
   sideeffekter»**, or «sideeffekten kjørte én gang» about the run on screen. If pressed on the
   mechanism: one owner at a time (row lock + lease compare-and-set), enqueue deduplicated by
   idempotency key, and a per-step key the app passes to Storage so its own writes dedupe.
2. **The engine is mandatory in v9, not a feature you switch on.** There is no flag and no
   in-process fallback — the only configuration is a platform URL. Do not offer it as opt-in, and
   do not promise a way to turn it off.
3. **Live in-flight status in the submitting tab is not merged.** On `main` the tab that pressed
   «Send inn» shows its own button spinner; a *reloaded* tab shows the processing view. Present the
   live status as work in progress. (Related: the failure-storm throttling is built and tested but
   ships disabled — «bygget, klar til å skrus på per miljø», never «beskytter produksjon i dag».)

And two standing rules from the copy: v9 is **preview** (9.0.0-preview.5, engine deployed in test
environments only — this is a «join the pilot» pitch, not «upgrade today»), and **never name an
archive-system vendor** — say *arkivintegrasjon* / *arkivsystem*.

---

## Slide by slide

### 1 — Ett klikk, mange ting · 1 click

> Dette er utgangspunktet for hele presentasjonen. Vi skal se på hva som faktisk skjer bak det
> klikket, hvor det ryker, og hva vi har gjort med det. Ingen forkunnskaper trengs.

`→` fans the ten things out of the button.

### 2 — Slik ser det ut i dag · 2 clicks

> Rekkefølgen er en rett linje med «await» etter «await». Det finnes ingen transaksjon rundt den,
> og ingenting som rydder opp hvis linjen brytes på midten.

`→` «Ingen transaksjon rundt rekka» · `→` «Ingenting rydder opp».

### 3 — Alt henger i én tråd · 2 clicks

> Dette er kjernen. Det er ikke at koden er dårlig — den er god. Det er at arbeidet bare eksisterer
> i minnet til én prosess, i den tiden nettleseren holder forbindelsen åpen.

`→` «Ingen varige spor» · `→` the empty note sheet.

### 4 — Når det ryker midtveis · 2 clicks

> Sideeffektene kjørte før prosessteget ble lagret. Det betyr at vi kan sitte igjen med halvt
> utført arbeid som ingen vet om. Neste forsøk begynner helt forfra.

`→` the pod dies mid-chain · `→` the three outcomes.

### 5 — Dobbeltinnsending · 3 clicks

> Fra v8.11 kom det en lås mot Storage, og den hjelper mot samtidige klikk. Men den er en leie med
> fem minutters levetid, og det finnes ingen nøkkel som gjenkjenner at «dette er det samme forsøket
> én gang til».

`→` the second click · `→` two of everything out the right · `→` the v8.11 lock caveat. **Do not
skip the third click** — it is what keeps the slide honest.

### 6 — Halvveis utført · 4 clicks

> Registrering mot hendelsestjenesten var pakket inn i en logglinje — feilet den, gikk den tapt uten
> spor. Og en forsendelse som feiler halvveis, kan allerede ha lastet opp vedlegg på den andre
> siden. Siste klikk: dobbeltklikk. Låsen fra v8.11 stopper to samtidige klikk, men kjenner ikke
> igjen det samme forsøket én gang til — det gjør idempotensnøkkelen i v9.

One card per click: forsendelsen · hendelsen · vedleggene (the PDF card is already up), then `→` for
the double-click strip along the bottom. **Do not skip the fourth click** — it is where the deck now
answers the double-submit question, and the honest half-answer in v8.11 is part of the answer.

### 7 — Driftshverdagen · 2 clicks

> Den lange ventingen på leveransebekreftelse var bygget på at app-en sendte en hendelse til seg
> selv og lånte en annen tjenestes forsøksrytme som klokke. Gikk tiden ut, måtte noen tømme en kø
> for hånd.

`→` «Hvor mange instanser står fast akkurat nå?» · `→` «Hvorfor?»

### 8 — En motor for prosessen · 3 clicks

> App-en melder inn hva som skal skje og får svar. Motoren skriver hvert steg til Postgres, kjører
> dem i rekkefølge, og kaller tilbake til app-en for hvert steg. Databasen er fasit — ingen kø i
> minnet.

`→` enqueue + the engine · `→` the callback per step · `→` the steps in Postgres.

### 9 — Simulering 1: Innbyggeren · plays itself, ~15 s · 0 clicks

> Samme uhell på begge sider — spørsmålet er hva det koster Kari. Til venstre: en feilmelding, og
> ingen som vet om noe ble gjort. Til høyre er arbeidet skrevet ned før det utføres, så en annen
> server tar over der den forrige slapp, og det som alt var gjort, gjøres ikke om igjen.

Two phones, the same accident. Talk across it, do not click through it. `Space` pauses if you want to
hold a beat, `R` plays it again, `→` moves on.

**Careful here:** the waiting screen «Vi jobber med skjemaet ditt» appears *after* the connection
breaks, because that is what is true on `main` today — the tab that pressed «Send inn» shows its own
button spinner, and it is a reloaded tab that gets the processing view. Do not promise live status in
the submitting tab.

### 10 — Simulering 2: Mottakeren · plays itself, ~15 s · 0 clicks

> Her er poenget at venting ikke er en feil. Steget parkeres, slipper arbeideren og sjekker igjen
> etter avtalt tid. En ekte feil gir nytt forsøk med voksende pause — ett sekund, så mer, med litt
> tilfeldig spredning så ikke alle banker på samtidig. Kari er ferdig lenge før mottakeren er oppe.

A status card per side: the receiving system going from «Tilgjengelig» to «Utilgjengelig» and back,
and one line for what the citizen is left with. Say *mottakersystem*, never a product name. `Space`
pauses, `R` replays, `→` moves on.

### 11 — Simulering 3: Driftsvakta · plays itself, ~15 s · 0 clicks

> Feil skjer uansett, også med motoren. Forskjellen er natta etterpå: i dag leter vi i loggene og
> rydder manuelt, sak for sak. Med motoren står steget i dashbordet med status, tidsbruk og hele
> feilhistorikken — og drift kan kjøre det på nytt fra steget som feilet.

Two laptops: a wall of log lines on the left, the step in the dashboard on the right, with the
«Kjør på nytt» button pressed on the fifth beat. That button calls the same open API as everyone
else. `Space` pauses, `R` replays, `→` moves on.

### 12 — Vi kan se hva som skjer · 3 clicks

> Dashbordet viser aktive kjeder i sanntid, tid brukt per steg, nedtelling til neste forsøk, og hele
> feilhistorikken med statuskode. Derfra kan drift kjøre et steg på nytt, be det sjekke nå, eller gi
> opp — knappene kaller det samme åpne API-et som alle andre bruker.

`→` open the step · `→` the error history · `→` the operator buttons.

### 13 — Hva betyr det for apputviklere · 2 clicks

> Prosessfilen i maloppsettet er byte for byte lik mellom v8 og v9. Det som endrer seg, er noen navn
> i koden, at PDF og forsendelse blir egne tjenesteoppgaver, og at oppgaver som venter lenge får et
> eget API for det. «studioctl app upgrade v9» skriver om det den kan, og skriver «TODO» for resten.

`→` the upgrade run · `→` the three bullets.

### 14 — Bli med i pilotene · 3 clicks

> Vær ærlig her: dette er ikke ferdig, og det er nettopp derfor vi spør nå. Vi vil ha apper med ekte
> tjenesteoppgaver — PDF, forsendelse, arkiv — fordi det er der forskjellen er størst og der vi
> trenger tilbakemelding. Ta kontakt, så hjelper vi med oppgraderingen.

`→` step 2 · `→` step 3 · `→` the ask. End here — the deck parks on the last state, so an extra
press does nothing.

---

## If something goes wrong

- **A simulation looks stuck.** Press `R` — it plays again from the beginning. (`Space` may simply
  have paused it; the button at the right-hand end of the rail says `Spill av` when it is paused, and
  `Spill igjen` once the run has finished.) Stepping off the slide and back on (`↑` then `↓`) also
  starts the scene over from zero.
- **You lost your place.** `O` for the overview and click the slide, or `Home` and `↓` your way
  back.
- **The window is the wrong shape.** The deck letterboxes itself; nothing is cut off, there will
  just be bars. `f` for fullscreen.

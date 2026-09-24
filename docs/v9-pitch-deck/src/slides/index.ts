import type { SlideDef } from '../deck';

import Forside from './01-forside';
import InfraNyttIV9 from './03-infra-nytt-i-v9';
import FrontendFolgerAppen from './05-frontend-folger-appen';
import FrontendBrukerneMerker from './06-frontend-brukerne-merker';
import EttKlikk from './08-ett-klikk';
import ScenarioFeil from './09-scenario-feil';
import ScenarioOmstart from './10-scenario-omstart';
import ForUtviklere from './11-for-utviklere';
import Dashbord from './12-dashbord';
import Oppgradering from './13-oppgradering';
import BliMed from './14-bli-med';
import IDag from './91-i-dag';
import EnTrad from './92-en-trad';
import Midtveis from './93-midtveis';
import Dobbeltinnsending from './94-dobbeltinnsending';
import Halvveis from './95-halvveis';
import Driftshverdagen from './96-driftshverdagen';
import Prosessmotor from './97-prosessmotor';
import { SeksjonBackend, SeksjonFrontend, SeksjonInfrastruktur, SeksjonReserve } from './seksjoner';
import { SIM_STEPS } from '../sims';

import '../styles/slides.css';

/**
 * THE SLIDE REGISTRY — the v9 town hall, in stage order.
 *
 * A cover that maps the talk, three parts — infrastruktur, frontend, backend —
 * then the ask. The talk ends
 * on «bli-med»; the reserve slides after it are for questions and are reached
 * with `o` or `End`.
 *
 * Copy follows `CONTENT.md` (norsk bokmål); `notes` are the taleranmerkninger.
 * Accuracy rules that hold across the deck: si «ingen dupliserte sideeffekter»
 * eller «det som er fullført, kjøres ikke på nytt», aldri «nøyaktig én gang»;
 * motoren er obligatorisk i v9; v9 er i lukket beta (sies i notatene, ikke på slidene); ingen produktnavn på
 * arkivsystemer; ingen fartsløfter utover målingen som finnes.
 */
export const slides: SlideDef[] = [
  {
    id: 'forside',
    component: Forside,
    steps: 2,
    notes:
      'Tre deler: plattformen appene kjører på, det brukerne ser, og det appen gjør bak kulissene. Vi avslutter med hvordan dere kan bli med som pilot.',
  },
  {
    id: 'seksjon-infrastruktur',
    component: SeksjonInfrastruktur,
    notes: 'Del 1: plattformen.',
  },
  {
    id: 'infra-nytt-i-v9',
    component: InfraNyttIV9,
    steps: 1,
    notes:
      'Plattformen tar mer av jobben: prosessmotoren, én fast Maskinporten-identitet per app, og myke omstarter der det som pågår får bli ferdig. Siste klikk: det som er på vei — status fra prosessmotoren rett i adminsidene i Studio. Den er ikke ute ennå; si «på vei». Linja nederst er ærlig ment: utrulling, Maskinporten-klienten (fra 8.3.0), PDF-tjenesten og varslene har v8-appene også fått.',
  },
  {
    id: 'seksjon-frontend',
    component: SeksjonFrontend,
    notes: 'Del 2: det brukerne ser.',
  },
  {
    id: 'frontend-folger-appen',
    component: FrontendFolgerAppen,
    steps: 1,
    notes:
      'Frontend har fått ny arkitektur under panseret: hver side henter dataene sine og husker dem, og det appen trenger for å starte, kommer i første svar. Og i v9 ligger frontend i appen, så det du tester er det brukerne får — i v8 henter appen alltid nyeste versjon. Tallet er én måling i et skjema med 32 sider; si det om noen spør. Ikke si «bygget på nytt».',
  },
  {
    id: 'frontend-brukerne-merker',
    component: FrontendBrukerneMerker,
    notes:
      'Fire ting brukerne merker. Rolig venting med beskjed om at det er trygt å lukke siden etter åtte sekunder. Samme status om siden lastes på nytt. Ingen tapte svar. Og en feilliste som ikke roper før brukeren prøver å gå videre.',
  },
  {
    id: 'seksjon-backend',
    component: SeksjonBackend,
    notes: 'Del 3: det appen gjør bak kulissene — prosessene, stegene og logikken. «Send inn» er bare det mest kjente eksempelet.',
  },
  {
    id: 'ett-klikk',
    component: EttKlikk,
    steps: 2,
    notes:
      'Ett klikk på «Send inn» setter i gang ti ting, og i v8 må alle lykkes mens brukeren venter på svar. Andre klikk: i v9 lagrer plattformen hvert av dem og gjør dem ferdig. Feiler noe, prøves det igjen, og det som er fullført, kjøres ikke på nytt. Si aldri «nøyaktig én gang». Vi skal se to eksempler.',
  },
  {
    id: 'scenario-feil',
    component: ScenarioFeil,
    steps: SIM_STEPS.feil,
    notes:
      'Samme uhell to ganger. Først v8: Kari blir stående på samme side med en feilmelding, må prøve igjen selv, og da kjøres alt fra starten — for eksempel blir PDF-en laget to ganger. Så v9: Kari ser at arbeidet fortsetter, plattformen prøver igjen selv, og bare steget som feilet kjøres på nytt. Til slutt: de to utfallene side om side.',
  },
  {
    id: 'scenario-omstart',
    component: ScenarioOmstart,
    steps: SIM_STEPS.omstart,
    notes:
      'Dette skjer hver gang en ny versjon rulles ut. I v8 stopper arbeidet midt i: PDF-en er laget, resten er ikke gjort, og ingen vet hvor langt det kom. I v9 er hvert steg lagret, så arbeidet fortsetter der det stoppet når serveren er tilbake. Kari merker bare litt venting.',
  },
  {
    id: 'for-utviklere',
    component: ForUtviklere,
    steps: 3,
    notes:
      'For dere som bygger apper: tjenesteoppgaver kan deles i steg som hver lagres når de er ferdige. En oppgave kan vente i timer eller dager på svar fra et annet system. Oppgaven er sitt eget ventesteg, så et eget «feedback»-steg trengs ikke lenger. Og dere kan selv velge hvor lenge et steg skal prøves igjen.',
  },
  {
    id: 'dashbord',
    component: Dashbord,
    steps: 3,
    notes:
      'Dashbordet viser prosesser som pågår, tid brukt per steg, nedtelling til neste forsøk og hele feilhistorikken. Derfra kan drift kjøre et steg på nytt, be det sjekke nå, eller gi opp.',
  },
  {
    id: 'oppgradering',
    component: Oppgradering,
    steps: 1,
    notes:
      'Prosessfilen i malen er lik i v8 og v9. Oppgraderingsverktøyet skriver om det det kan, og peker ut tre ting dere gjør selv: tilganger appen bruker selv, arkivoppgaver, og ventesteg som ikke lenger trengs. Prosessmotoren er en fast del av v9, ikke noe man skrur av eller på.',
  },
  {
    id: 'bli-med',
    component: BliMed,
    steps: 3,
    notes:
      'Vi tar inn pilotapper nå. Om noen spør: v9 er i lukket beta, foreløpig internt, og vi åpner for flere organisasjoner etter hvert som dere melder dere. Vi hjelper med oppgraderingen. Slutt her — reserveslidene etter denne er for spørsmål.',
  },
  {
    id: 'seksjon-reserve',
    component: SeksjonReserve,
    notes: 'Reserve. Bruk `o` for å hoppe hit ved spørsmål om hvordan v8 gjør det i dag, eller hvordan motoren er bygget.',
  },
  {
    id: 'i-dag',
    component: IDag,
    steps: 2,
    notes:
      'Rekkefølgen er en rett linje med «await» etter «await». Det finnes ingen transaksjon rundt den, og ingenting som rydder opp hvis linjen brytes på midten.',
  },
  {
    id: 'en-trad',
    component: EnTrad,
    steps: 2,
    notes:
      'Dette er kjernen. Det er ikke at koden er dårlig — den er god. Det er at arbeidet bare eksisterer i minnet til én prosess, i den tiden nettleseren holder forbindelsen åpen.',
  },
  {
    id: 'midtveis',
    component: Midtveis,
    steps: 2,
    notes:
      'Sideeffektene kjørte før prosessteget ble lagret. Det betyr at vi kan sitte igjen med halvt utført arbeid som ingen vet om. Neste forsøk begynner helt forfra.',
  },
  {
    id: 'dobbeltinnsending',
    component: Dobbeltinnsending,
    steps: 3,
    notes:
      'Fra v8.11 kom det en lås mot Storage, og den hjelper mot samtidige klikk. Men den er en leie med fem minutters levetid, og det finnes ingen nøkkel som gjenkjenner at «dette er det samme forsøket én gang til».',
  },
  {
    id: 'halvveis',
    component: Halvveis,
    steps: 4,
    notes:
      'Registrering mot hendelsestjenesten var pakket inn i en logglinje — feilet den, gikk den tapt uten spor. Og en forsendelse som feiler halvveis, kan allerede ha lastet opp vedlegg på den andre siden. Siste klikk: dobbeltklikk. Låsen fra v8.11 stopper to samtidige klikk, men kjenner ikke igjen det samme forsøket én gang til — det gjør idempotensnøkkelen i v9.',
  },
  {
    id: 'driftshverdagen',
    component: Driftshverdagen,
    steps: 2,
    notes:
      'Den lange ventingen på leveransebekreftelse var bygget på at app-en sendte en hendelse til seg selv og lånte en annen tjenestes forsøksrytme som klokke. Gikk tiden ut, måtte noen tømme en kø for hånd.',
  },
  {
    id: 'prosessmotor',
    component: Prosessmotor,
    steps: 3,
    notes:
      'App-en melder inn hva som skal skje og får svar. Motoren skriver hvert steg til Postgres, kjører dem i rekkefølge, og kaller tilbake til app-en for hvert steg. Databasen er fasit — ingen kø i minnet.',
  },
];

export default slides;

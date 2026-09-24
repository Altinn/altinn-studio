import type { SlideDef } from '../deck';

import EttKlikk from './01-ett-klikk';
import TreOmrader from './02-tre-omrader';
import InfraForAlle from './04-infra-for-alle';
import InfraNyttIV9 from './05-infra-nytt-i-v9';
import FrontendFolgerAppen from './07-frontend-folger-appen';
import FrontendBrukerneMerker from './08-frontend-brukerne-merker';
import ArbeidetSkrivesNed from './10-arbeidet-skrives-ned';
import ScenarioFeil from './11-scenario-feil';
import ScenarioOmstart from './12-scenario-omstart';
import ForUtviklere from './13-for-utviklere';
import Dashbord from './14-dashbord';
import Oppgradering from './15-oppgradering';
import BliMed from './16-bli-med';
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
 * Three parts — infrastruktur, frontend, backend — then the ask. The talk ends
 * on «bli-med»; the reserve slides after it are for questions and are reached
 * with `o` or `End`.
 *
 * Copy follows `CONTENT.md` (norsk bokmål); `notes` are the taleranmerkninger.
 * Accuracy rules that hold across the deck: si «ingen dupliserte sideeffekter»
 * eller «det som er fullført, kjøres ikke på nytt», aldri «nøyaktig én gang»;
 * motoren er obligatorisk i v9; v9 er i lukket beta; ingen produktnavn på
 * arkivsystemer; ingen fartsløfter utover målingen som finnes.
 */
export const slides: SlideDef[] = [
  {
    id: 'ett-klikk',
    component: EttKlikk,
    steps: 1,
    notes:
      'Dette er utgangspunktet. Ett klikk på «Send inn» setter i gang ti ting, og i v8 må alle ti lykkes mens brukeren venter på svar. I dag skal vi se hva som blir bedre med v9 — på plattformen, i det brukerne ser, og i det som skjer etter klikket.',
  },
  {
    id: 'tre-omrader',
    component: TreOmrader,
    steps: 2,
    notes:
      'Tre deler. Først plattformen appene kjører på, så frontend — det brukerne ser — og til slutt backend, som er det som skjer etter «Send inn». Vi avslutter med hvordan dere kan bli med.',
  },
  {
    id: 'seksjon-infrastruktur',
    component: SeksjonInfrastruktur,
    notes: 'Del 1: plattformen.',
  },
  {
    id: 'infra-for-alle',
    component: InfraForAlle,
    notes:
      'Vær ærlig her: mye av det som er bedre på plattformen, har v8-appene allerede fått. Utrulling følges til den er ferdig, Maskinporten-klienten lages og roteres av plattformen — fra 8.3.0 — alle PDF-er lages av den nye tjenesten, og tjenesteeiere kan få varsler. Det er ikke noe dere må oppgradere for.',
  },
  {
    id: 'infra-nytt-i-v9',
    component: InfraNyttIV9,
    steps: 1,
    notes:
      'Dette krever v9: prosessmotoren, som vi kommer tilbake til, én fast Maskinporten-identitet per app, og myke omstarter der det som pågår får bli ferdig. Siste klikk: det som kommer — status fra prosessmotoren rett i adminsidene i Studio. Si «kommer», ikke «finnes».',
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
      'Den største endringen er ikke hvordan frontend ser ut, men hvordan den kommer ut. I v8 henter appen alltid nyeste versjon, så brukerne kan få noe du ikke har testet. I v9 ligger frontend i appen. Tallet er én tidlig måling i en testapp med 32 sider — si det sånn, ikke «mye raskere».',
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
    notes: 'Del 3: det som skjer etter «Send inn».',
  },
  {
    id: 'arbeidet-skrives-ned',
    component: ArbeidetSkrivesNed,
    steps: 3,
    notes:
      'Dette er hele ideen i én setning. Hvert steg etter «Send inn» lagres av plattformen og følges opp til det er ferdig. Feiler noe, prøves det igjen. Det som er fullført, kjøres ikke på nytt. Og alt kan ses. Vi skal se to eksempler.',
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
      'Dashbordet viser innsendinger som pågår, tid brukt per steg, nedtelling til neste forsøk og hele feilhistorikken. Derfra kan drift kjøre et steg på nytt, be det sjekke nå, eller gi opp.',
  },
  {
    id: 'oppgradering',
    component: Oppgradering,
    steps: 2,
    notes:
      'Prosessfilen i malen er lik i v8 og v9. Oppgraderingsverktøyet skriver om det det kan, og peker ut tre ting dere gjør selv: tilganger appen bruker selv, arkivoppgaver, og ventesteg som ikke lenger trengs. Vi hjelper med resten.',
  },
  {
    id: 'bli-med',
    component: BliMed,
    steps: 3,
    notes:
      'Vær ærlig her: v9 er i lukket beta, foreløpig internt, og det er nettopp derfor vi spør nå. Vi åpner for flere organisasjoner etter hvert som dere melder dere, og vi hjelper med oppgraderingen. Slutt her — reserveslidene etter denne er for spørsmål.',
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

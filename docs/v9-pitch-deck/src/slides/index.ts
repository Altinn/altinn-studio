import type { SlideDef } from '../deck';

import Forside from './01-forside';
import InfraNyttIV9 from './03-infra-nytt-i-v9';
import FrontendFolgerAppen from './05-frontend-folger-appen';
import FrontendBrukerneMerker from './06-frontend-brukerne-merker';
import EttKlikk from './11-ett-klikk';
import ScenarioFeil from './12-scenario-feil';
import ScenarioOmstart from './13-scenario-omstart';
import ForUtviklere from './09-for-utviklere';
import Dashbord from './10-dashbord';
import Oppgradering from './14-oppgradering';
import BliMed from './15-bli-med';
import Prosessmotor from './08-prosessmotor';
import { SeksjonBackend, SeksjonFrontend, SeksjonInfrastruktur } from './seksjoner';
import { SIM_STEPS } from '../sims';

import '../styles/slides.css';

/**
 * THE SLIDE REGISTRY — the v9 town hall, in stage order.
 *
 * A cover that maps the talk, three parts — infrastruktur, frontend, backend —
 * then the ask.
 *
 * Copy follows `CONTENT.md` (norsk bokmål); `notes` are the taleranmerkninger.
 * Accuracy rules that hold across the deck: si «ingen dupliserte sideeffekter»
 * eller «det som er fullført, kjøres ikke på nytt», aldri «nøyaktig én gang»;
 * motoren er obligatorisk i v9; v9 er i åpen beta; ingen produktnavn på
 * arkivsystemer; ingen fartsløfter utover målingen som finnes.
 */
export const slides: SlideDef[] = [
  {
    id: 'forside',
    component: Forside,
    notes:
      'Tre deler: plattformen appene kjører på, det brukerne ser, og det appen gjør bak kulissene. Vi avslutter med hvordan dere kommer i gang.',
  },
  {
    id: 'seksjon-infrastruktur',
    component: SeksjonInfrastruktur,
    notes: 'Del 1: plattformen.',
  },
  {
    id: 'infra-nytt-i-v9',
    component: InfraNyttIV9,
    notes:
      'Plattformen tar mer av jobben. Prosessmotoren gjør at prosessene tåler feil: hvert steg lagres og gjøres ferdig, også når noe feiler. Plattformen lager Maskinporten-klienten og tar seg av den. Og adminsidene i Studio viser hvilke prosesser som står fast, og lar dere starte dem igjen. Banneret nederst er ærlig ment: utrulling, PDF-tjenesten og varslene har v8-appene også fått. Om noen spør: den plattformstyrte Maskinporten-klienten finnes for v8-apper fra 8.3.0, men i v9 er den den eneste måten.',
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
      'Frontend har fått ny arkitektur under panseret: hver side henter dataene sine og husker dem, og det appen trenger for å starte, kommer i første svar. Tallene kommer fra én måling i et skjema med 32 sider. Si det hvis noen spør, og ikke si «bygget på nytt». Andre klikk: i v9 ligger frontend i samme pakke som appen. Appen din er backend, altså Altinn-bibliotekene og deres egen kode, pluss frontend, og alt har samme versjon. I v8 henter appen alltid nyeste frontend, så brukerne kan få en versjon du ikke har testet. Nå er den versjonen du tester, den samme som brukerne får.',
  },
  {
    id: 'frontend-brukerne-merker',
    component: FrontendBrukerneMerker,
    notes:
      'Fire ting brukerne merker. Tydelig venting, med beskjed om at det er trygt å lukke siden etter åtte sekunder. Status som varer: laster brukeren siden på nytt, vises samme status som før. Ingen tapte svar. Og en feilliste som vises først når brukeren prøver å gå videre.',
  },
  {
    id: 'seksjon-backend',
    component: SeksjonBackend,
    notes: 'Del 3: det appen gjør bak kulissene, altså prosessene, stegene og logikken. «Send inn» er bare det mest kjente eksempelet.',
  },
  {
    id: 'prosessmotor',
    component: Prosessmotor,
    notes:
      'Dette er hele ideen. Appen sier hva som skal skje, og prosessmotoren sørger for at det blir gjort. Hvert steg lagres før det gjøres, så en feil eller en omstart underveis ikke betyr at noe går tapt. Det gjelder alle overganger i prosessen, ikke bare «Send inn».',
  },
  {
    id: 'for-utviklere',
    component: ForUtviklere,
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
    id: 'ett-klikk',
    component: EttKlikk,
    steps: 2,
    notes:
      'Nå et eksempel alle kjenner. Ett klikk på «Send inn» setter i gang ti ting, og i v8 må alle lykkes mens brukeren venter på svar. Andre klikk: i v9 lagres hvert av dem og gjøres ferdig. Feiler noe, prøves det igjen, og det som er fullført, kjøres ikke på nytt. Si aldri «nøyaktig én gang». Så to scenarier.',
  },
  {
    id: 'scenario-feil',
    component: ScenarioFeil,
    steps: SIM_STEPS.feil,
    notes:
      'Samme uhell to ganger. Først v8: Kari blir stående på samme side med en feilmelding, må prøve igjen selv, og da kjøres alt fra start. En melding appen sender underveis, kan for eksempel gå ut to ganger. Så v9: Kari ser at arbeidet fortsetter, plattformen prøver igjen selv, og bare steget som feilet kjøres på nytt. Til slutt: de to utfallene side om side.',
  },
  {
    id: 'scenario-omstart',
    component: ScenarioOmstart,
    steps: SIM_STEPS.omstart,
    notes:
      'Dette skjer hver gang en ny versjon rulles ut. I v8 stopper arbeidet midt i: PDF-en er laget, resten er ikke gjort, og ingen vet hvor langt det kom. I v9 er hvert steg lagret, så arbeidet fortsetter der det stoppet når serveren er tilbake. Kari merker bare litt venting.',
  },
  {
    id: 'oppgradering',
    component: Oppgradering,
    steps: 1,
    notes:
      'Prosessfilen i malen er lik i v8 og v9. Oppgraderingen kjøres rett fra Studio, eller med studioctl. Verktøyet skriver om navn og navnerom, gjør PDF og forsendelse om til tjenesteoppgaver og legger til tilgangene appen trenger. To ting viser det at dere må gjøre for hånd: skrive om egen kode i prosessteg, og fjerne ventesteg som ikke lenger trengs. Prosessmotoren er en fast del av v9, ikke noe man skrur av eller på.',
  },
  {
    id: 'bli-med',
    component: BliMed,
    notes:
      'v9 er i åpen beta, og alle kan oppgradere selv, rett fra Studio eller med studioctl. Rull ut til test og prøv som vanlig, og si fra hva som skurrer. Trenger dere hjelp, tar vi det gjerne.',
  },
];

export default slides;

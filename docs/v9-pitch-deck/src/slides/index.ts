import type { SlideDef } from '../deck';

import Forside from './01-forside';
import Kari from './02-kari';
import FrontendBrukerneMerker from './04-frontend-brukerne-merker';
import FrontendFolgerAppen from './05-frontend-folger-appen';
import InfraNyttIV9 from './07-infra-nytt-i-v9';
import Prosessmotor from './08-prosessmotor';
import LagPaLag from './09-lag-pa-lag';
import ForUtviklere from './10-for-utviklere';
import Dashbord from './11-dashbord';
import ScenarioFeil from './12-scenario-feil';
import ScenarioLukker from './13-scenario-lukker';
import Oppgradering from './15-oppgradering';
import BliMed from './16-bli-med';
import { SeksjonBakKulissene, SeksjonBrukerne, SeksjonKomIGang } from './seksjoner';
import { SIM_STEPS } from '../sims';

import '../styles/slides.css';

/**
 * THE SLIDE REGISTRY — the v9 town hall, in stage order.
 *
 * A cover that maps the talk, a short hook (the v8 half of Kari's first example), then
 * three parts — det brukerne merker, bak kulissene, kom i gang. Part 2 ends on
 * Kari's two examples, the first of them picking up where the hook left off.
 *
 * `notes` are the taleranmerkninger (norsk bokmål). Accuracy rules that hold
 * across the deck: si «det som er fullført, kjøres ikke på nytt», aldri
 * «nøyaktig én gang» eller at ingenting kan skje to ganger; motoren er
 * obligatorisk i v9; v9 er i åpen beta; ingen produktnavn på arkivsystemer;
 * ingen fartsløfter utover målingen som finnes.
 */
export const slides: SlideDef[] = [
  {
    id: 'forside',
    component: Forside,
    notes:
      'Tre deler: det brukerne merker, det som skjer bak kulissene, og hvordan dere kommer i gang. Men først Kari.',
  },
  {
    id: 'kari',
    component: Kari,
    steps: SIM_STEPS.teaser,
    notes:
      'Kari har fylt ut et skjema og trykker «Send inn». En tjeneste appen er avhengig av, er nede en liten stund. I dag, med v8, får hun en teknisk feilmelding, blir stående på samme side og må prøve igjen selv. Hva v9 gjør med dette, kommer vi tilbake til.',
  },
  {
    id: 'seksjon-brukerne',
    component: SeksjonBrukerne,
    notes: 'Del 1: det brukerne merker.',
  },
  {
    id: 'frontend-brukerne-merker',
    component: FrontendBrukerneMerker,
    notes:
      'Fire ting brukerne merker. Tydelig venting, med beskjed om at det er trygt å lukke siden etter åtte sekunder. Status som varer: laster brukeren siden på nytt, vises samme status som før. Ingen tapte svar. Og en feilliste som vises først når brukeren prøver å gå videre.',
  },
  {
    id: 'frontend-folger-appen',
    component: FrontendFolgerAppen,
    steps: 1,
    notes:
      'Frontend har fått ny arkitektur under panseret: hver side henter dataene sine og husker dem, og det appen trenger for å starte, kommer i første svar. Tallene kommer fra én måling i et skjema med 32 sider. Si det hvis noen spør, og ikke si «bygget på nytt». Andre klikk: i v9 ligger frontend i samme pakke som appen. Appen din er backend, altså Altinn-bibliotekene og deres egen kode, pluss frontend, og alt har samme versjon. I v8 henter appen alltid nyeste frontend, så brukerne kan få en versjon du ikke har testet. Nå er den versjonen du tester, den samme som brukerne får.',
  },
  {
    id: 'seksjon-bak-kulissene',
    component: SeksjonBakKulissene,
    notes:
      'Del 2: det som skjer bak kulissene, altså plattformen, prosessene, stegene og logikken.',
  },
  {
    id: 'infra-nytt-i-v9',
    component: InfraNyttIV9,
    notes:
      'Plattformen tar mer av jobben. Prosessmotoren gjør at prosessene tåler feil: hvert steg lagres og gjøres ferdig, også når noe feiler. Plattformen lager Maskinporten-klienten og tar seg av den. Og adminsidene i Studio viser hvilke prosesser som står fast, og lar dere starte dem igjen. Banneret nederst er ærlig ment: utrulling, PDF-tjenesten og varslene har v8-appene også fått. Om noen spør: den plattformstyrte Maskinporten-klienten finnes for v8-apper fra 8.3.0, men i v9 er den den eneste måten.',
  },
  {
    id: 'prosessmotor',
    component: Prosessmotor,
    notes:
      'Dette er hele ideen. Appen sier hva som skal skje, og prosessmotoren sørger for at det blir gjort. Hvert steg lagres før det gjøres, så en feil eller en omstart underveis ikke betyr at noe går tapt. Det gjelder alle overganger i prosessen, ikke bare «Send inn».',
  },
  {
    id: 'lag-pa-lag',
    component: LagPaLag,
    steps: 7,
    notes:
      'Samme prosess, og for hvert klikk et nytt lag under den. Slik tegner dere prosessen i Studio. I v8 lages PDF-en skjult i overgangen fra utfylling til slutt. Første klikk: i v9 er PDF-en en egen tjenesteoppgave. Andre klikk: Kari starter skjemaet. Før hun ser det, har prosessmotoren startet steget, fylt ut det som kan fylles ut på forhånd, kjørt appens egen kode og lagret. Tredje klikk: mens Kari fyller ut, er det appen som svarer henne, akkurat som i dag. Validering, beregninger og lagring underveis skjer der, ikke i motoren. Merket over prosessen viser hele veien hvor Kari og skjemaet er. Fjerde klikk: Kari sender inn. Motoren avslutter steget, låser svarene og lagrer, og så lager den PDF-en. Femte klikk: hendelsene til andre systemer går som egne jobber i bakgrunnen så snart en overgang er lagret. De holder ikke prosessen igjen. Sjette klikk: PDF-tjenesten svarer ikke. Bare det steget prøves igjen. Det som er fullført, kjøres ikke på nytt, og bakgrunnsjobbene er allerede sendt. Sjuende klikk: PDF-en er laget, og prosessen går videre til slutt uten at noen gjør noe.',
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
      'Dashbordet viser prosesser som pågår, tid brukt per steg, nedtelling til neste forsøk og hele feilhistorikken. Derfra kan drift kjøre et steg på nytt, be det sjekke nå, eller gi opp. Så tilbake til Kari.',
  },
  {
    id: 'scenario-feil',
    component: ScenarioFeil,
    steps: SIM_STEPS.feil,
    notes:
      'Her forlot vi Kari: teknisk feilmelding, og hun må prøve igjen selv. Nå v9, linje for linje: Kari får beskjed om at vi prøver igjen, plattformen gjør det selv, og bare steget som feilet kjøres på nytt. De to siste linjene kommer på begge sider: i v8 kjøres alle ti på nytt. Hver gang Kari prøver igjen, gjøres alt en gang til: PDF-en lages på nytt, og appens egen kode kjører igjen, også kode som sender noe. Og skjemaet blir bare sendt fordi Kari prøver igjen. Gir hun opp, blir det aldri sendt. I v9 kjøres bare den som feilet, og kvitteringen er klar uten at hun gjør noe. Til slutt: de to utfallene side om side.',
  },
  {
    id: 'scenario-lukker',
    component: ScenarioLukker,
    steps: SIM_STEPS.lukker,
    notes:
      'Et eksempel til. Nå går Kari fra skjemaet før det er sendt, og mens hun er borte svarer ikke en tjeneste. I v8 er arbeidet knyttet til nettleseren hennes: feiler noe etter at hun har gått, prøver ingen igjen, og ingen sier fra. Skjemaet ligger fortsatt som utkast, og Kari tror det er sendt. I v9 er det plattformen som gjør jobben. Siden sier at hun trygt kan lukke den, plattformen prøver igjen, og kvitteringen ligger i innboksen når hun ser etter. Om noen spør: i v8 går arbeidet videre selv om fanen lukkes, så lenge ingenting feiler. Det er feilen etter at hun har gått, ingen tar seg av.',
  },
  {
    id: 'seksjon-kom-i-gang',
    component: SeksjonKomIGang,
    notes: 'Del 3: hvordan dere kommer i gang.',
  },
  {
    id: 'oppgradering',
    component: Oppgradering,
    steps: 1,
    notes:
      'Verktøyet gjør det meste. Oppgraderingen kjøres rett fra Studio, eller med studioctl. Det skriver om navn og navnerom, gjør PDF og forsendelse om til tjenesteoppgaver i prosessfilen og legger til tilgangene appen trenger. To ting viser det at dere må gjøre for hånd: skrive om egen kode i prosessteg, og fjerne ventesteg som ikke lenger trengs. Prosessmotoren er en fast del av v9, ikke noe man skrur av eller på.',
  },
  {
    id: 'bli-med',
    component: BliMed,
    notes:
      'v9 er i åpen beta, og alle kan oppgradere selv, rett fra Studio eller med studioctl. Rull ut til test og prøv som vanlig, og si fra hva som skurrer. Trenger dere hjelp, tar vi det gjerne.',
  },
];

export default slides;

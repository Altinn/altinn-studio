import type { SlideDef } from '../deck';

import EttKlikk from './01-ett-klikk';
import IDag from './02-i-dag';
import EnTrad from './03-en-trad';
import Midtveis from './04-midtveis';
import Dobbeltinnsending from './05-dobbeltinnsending';
import Halvveis from './06-halvveis';
import Driftshverdagen from './07-driftshverdagen';
import Prosessmotor from './08-prosessmotor';
import SimInnbygger from './10-sim-innbygger';
import SimUstabil from './11-sim-ustabil';
import SimDrift from './12-sim-drift';
import Dashbord from './13-dashbord';
import ForApputviklere from './14-for-apputviklere';
import BliMed from './15-bli-med';

import '../styles/slides.css';

/**
 * THE SLIDE REGISTRY — the v8 → v9 town hall, in stage order.
 *
 * Copy follows `CONTENT.md` (norsk bokmål); `notes` are the taleranmerkninger.
 * Accuracy rules that hold across the deck: si «ingen dupliserte sideeffekter»,
 * aldri «nøyaktig én gang»; motoren er obligatorisk i v9; strupingen er bygget,
 * men skrudd av; ingen produktnavn på arkivsystemer.
 */
export const slides: SlideDef[] = [
  {
    id: 'ett-klikk',
    component: EttKlikk,
    steps: 1,
    notes:
      'Dette er utgangspunktet for hele presentasjonen. Vi skal se på hva som faktisk skjer bak det klikket, hvor det ryker, og hva vi har gjort med det. Ingen forkunnskaper trengs.',
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
  {
    id: 'sim-innbygger',
    component: SimInnbygger,
    // The simulations play themselves. `steps: 0` on purpose: the presenter
    // hands the slide to the scene and the next `→` moves on to the next slide.
    steps: 0,
    notes:
      'Samme uhell på begge sider — spørsmålet er hva det koster Kari. Til venstre: en feilmelding, og ingen som vet om noe ble gjort. Til høyre er arbeidet skrevet ned før det utføres, så en annen server tar over der den forrige slapp, og det som alt var gjort, gjøres ikke om igjen. Merk: venteskjermen kommer når fanen er tilbake — den nye statusvisningen i fanen som trykket, er ikke slått sammen ennå.',
  },
  {
    id: 'sim-ustabil',
    component: SimUstabil,
    steps: 0,
    notes:
      'Her er poenget at venting ikke er en feil. Steget parkeres, slipper arbeideren og sjekker igjen etter avtalt tid. En ekte feil gir nytt forsøk med voksende pause — ett sekund, så mer, med litt tilfeldig spredning så ikke alle banker på samtidig. Kari er ferdig lenge før mottakeren er oppe igjen.',
  },
  {
    id: 'sim-drift',
    component: SimDrift,
    steps: 0,
    notes:
      'Feil skjer uansett, også med motoren. Forskjellen er natta etterpå: i dag leter vi i loggene og rydder manuelt, sak for sak. Med motoren står steget i dashbordet med status, tidsbruk og hele feilhistorikken — og drift kan kjøre det på nytt fra steget som feilet. Knappene kaller det samme åpne API-et som alle andre bruker.',
  },
  {
    id: 'dashbord',
    component: Dashbord,
    steps: 3,
    notes:
      'Dashbordet viser aktive kjeder i sanntid, tid brukt per steg, nedtelling til neste forsøk, og hele feilhistorikken med statuskode. Derfra kan drift kjøre et steg på nytt, be det sjekke nå, eller gi opp — knappene kaller det samme åpne API-et som alle andre bruker.',
  },
  {
    id: 'for-apputviklere',
    component: ForApputviklere,
    steps: 2,
    notes:
      'Prosessfilen i maloppsettet er byte for byte lik mellom v8 og v9. Det som endrer seg, er noen navn i koden, at PDF og forsendelse blir egne tjenesteoppgaver, og at oppgaver som venter lenge får et eget API for det. «studioctl app upgrade v9» skriver om det den kan, og skriver «TODO» for resten.',
  },
  {
    id: 'bli-med',
    component: BliMed,
    steps: 3,
    notes:
      'Vær ærlig her: dette er ikke ferdig, og det er nettopp derfor vi spør nå. Vi vil ha apper med ekte tjenesteoppgaver — PDF, forsendelse, arkiv — fordi det er der forskjellen er størst og der vi trenger tilbakemelding. Ta kontakt, så hjelper vi med oppgraderingen.',
  },
];

export default slides;

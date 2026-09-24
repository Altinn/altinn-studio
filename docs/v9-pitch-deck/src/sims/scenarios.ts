import type { Scenario, Screen } from './parts';

/**
 * The scenario scripts. Each one is the same accident told twice; see
 * `parts/scenario.ts` for the model and `parts/ScenarioStage.tsx` for the stage.
 *
 * The screens use the product's own words: the v8 toast is
 * `process_error.submit_error_please_retry`, and the v9 waiting view is
 * `process_workflow.still_working`, shown after 8 s (CONTENT.md §1).
 */

const READY: Screen = {
  title: 'Klar til å sende',
  body: 'Kari har fylt ut skjemaet.',
  tone: 'idle',
  button: 'Send inn',
};
const SENDING: Screen = { title: 'Sender inn …', tone: 'busy' };
/** v8 keeps the user on the same page, with the form's button still there. */
const V8_ERROR: Screen = {
  title: 'Noe gikk galt',
  body: 'Prøv igjen om noen minutter.',
  tone: 'bad',
  button: 'Send inn',
};
const V9_WORKING: Screen = {
  title: 'Dette tar uvanlig lang tid',
  body: 'Opplysningene dine er lagret. Du kan trygt lukke siden.',
  tone: 'busy',
};
const RECEIPT: Screen = { title: 'Kvittering klar', body: 'Skjemaet er levert.', tone: 'ok' };

/**
 * (1) NOE FEILER UNDER INNSENDING — a service the app depends on does not
 * answer for a moment, partway through «Send inn».
 *
 *  - v8 saves the process state only after every hook has run, so the user
 *    never moves: they stay on the same page with the toast. Nothing retries by
 *    itself, and a retry runs every hook of the transition again — a PDF the
 *    first attempt already stored is inserted a second time.
 *  - v9 retries the step automatically, and a completed step is not run again.
 *    «Ingenting ble gjort to ganger» is said about this run — never «umulig».
 */
export const FEIL: Scenario = {
  name: 'feil',
  title: 'Noe feiler under innsending',
  headline: 'En tjeneste appen er avhengig av, er nede en kort stund.',
  frame: 'skjema.altinn.no',
  v8: {
    start: READY,
    beats: [
      { id: 'send', text: 'Kari trykker «Send inn»', status: 'running', screen: SENDING },
      { id: 'fail', text: 'En tjeneste er nede', status: 'fail' },
      { id: 'seen', text: 'Kari står igjen på samme side', status: 'fail', screen: V8_ERROR },
      { id: 'retry', text: 'Hun må prøve på nytt selv', status: 'wait' },
      { id: 'again', text: 'Alt kjøres på nytt fra start', status: 'fail' },
      {
        id: 'twice',
        text: 'Noe blir gjort to ganger',
        status: 'fail',
        at: 'to PDF-er',
        screen: { title: 'Kvittering klar', body: 'Men noe ble gjort to ganger.', tone: 'wait' },
      },
    ],
    outcome: 'Kari måtte prøve igjen selv, og noe ble gjort to ganger.',
  },
  v9: {
    start: READY,
    beats: [
      { id: 'send', text: 'Kari trykker «Send inn»', status: 'running', screen: SENDING },
      { id: 'fail', text: 'En tjeneste er nede', status: 'fail' },
      { id: 'seen', text: 'Kari ser at arbeidet fortsetter', status: 'running', screen: V9_WORKING },
      { id: 'retry', text: 'Plattformen prøver igjen selv', status: 'running' },
      { id: 'only', text: 'Bare det som feilet, kjøres igjen', status: 'ok' },
      { id: 'end', text: 'Kvitteringen er klar', status: 'ok', screen: RECEIPT },
    ],
    outcome: 'Kari trengte ikke å gjøre noe, og ingenting ble gjort to ganger.',
  },
  takeaway: 'En kort feil gir litt ventetid, ikke en ny innsending.',
};

/**
 * (2) SERVEREN STARTES PÅ NYTT — a new version rolls out while Kari submits.
 * Every deploy restarts the app's servers, so this is the everyday case.
 *
 *  - v8 has no durable record of a transition in flight, and the side effects
 *    run before the process state is saved, so a PDF can be stored while the
 *    rest never happens and the process stays where it was.
 *  - v9 keeps every step in the engine's database. A step whose server went
 *    away is picked up again once a server is back, from the last completed
 *    step. The waiting view stays up, and a reload shows the same state.
 */
export const OMSTART: Scenario = {
  name: 'omstart',
  title: 'Serveren startes på nytt',
  headline: 'En ny versjon rulles ut mens Kari sender inn.',
  frame: 'skjema.altinn.no',
  v8: {
    start: READY,
    beats: [
      { id: 'send', text: 'Kari trykker «Send inn»', status: 'running', screen: SENDING },
      { id: 'restart', text: 'Serveren startes på nytt', status: 'fail' },
      { id: 'seen', text: 'Kari får en feilmelding', status: 'fail', screen: V8_ERROR },
      { id: 'half', text: 'PDF-en er laget, resten ikke', status: 'fail' },
      { id: 'unknown', text: 'Ingen vet hvor langt det kom', status: 'fail' },
      { id: 'retry', text: 'Kari må prøve igjen og håpe', status: 'wait' },
    ],
    outcome: 'Halvveis utført, og ingen vet hvor langt det kom.',
  },
  v9: {
    start: READY,
    beats: [
      { id: 'send', text: 'Kari trykker «Send inn»', status: 'running', screen: SENDING },
      { id: 'restart', text: 'Serveren startes på nytt', status: 'fail' },
      { id: 'seen', text: 'Kari ser at arbeidet fortsetter', status: 'running', screen: V9_WORKING },
      { id: 'saved', text: 'Hvert steg er lagret', status: 'ok' },
      { id: 'resume', text: 'Arbeidet fortsetter der det slapp', status: 'running' },
      { id: 'end', text: 'Kvitteringen er klar', status: 'ok', screen: RECEIPT },
    ],
    outcome: 'Ferdig. Kari merket bare litt venting.',
  },
  takeaway: 'Nye versjoner kan rulles ut midt på dagen. Innsendingene fortsetter der de slapp.',
};

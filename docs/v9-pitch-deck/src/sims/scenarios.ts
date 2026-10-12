import type { Scenario, Screen } from './parts';

/**
 * The scenario scripts. Each one is the same accident told twice; see
 * `parts/scenario.ts` for the model and `parts/ScenarioStage.tsx` for the stage.
 *
 * The screens show what the person actually sees:
 *
 *  - v8 (frontend 4.x) toasts the error's raw text. Only a failed PDF
 *    generation gets the friendly `process_error.submit_error_please_retry`;
 *    anything else shows the backend's exception message, or the HTTP client's
 *    own message when the connection itself broke.
 *  - v9 shows `process_workflow.having_trouble` once an attempt has failed twice
 *    (or once after 20 s), and `process_workflow.still_working` after 8 s
 *    otherwise. Both say the answers are saved and the page can be closed.
 */

const READY: Screen = {
  title: 'Klar til å sende',
  body: 'Kari har fylt ut skjemaet.',
  tone: 'idle',
  button: 'Send inn',
};
const SENDING: Screen = { title: 'Sender inn …', tone: 'busy' };
/** v8 keeps the user on the same page, with the form's button still there. */
const V8_SERVICE_DOWN: Screen = {
  title: '503 (Service Unavailable)',
  body: 'Response status code does not indicate success.',
  tone: 'bad',
  button: 'Send inn',
};
const V9_TROUBLE: Screen = {
  title: 'Vi kan ikke behandle skjemaet ditt akkurat nå',
  body: 'Vi prøver igjen automatisk. Opplysningene dine er lagret.',
  tone: 'wait',
};
const V9_WORKING: Screen = {
  title: 'Dette tar uvanlig lang tid',
  body: 'Du kan trygt lukke siden og komme tilbake senere.',
  tone: 'busy',
};
const RECEIPT: Screen = { title: 'Kvittering klar', body: 'Skjemaet er levert.', tone: 'ok' };
/** The tab is gone: nothing on screen any more. */
const CLOSED: Screen = { title: 'Siden er lukket', tone: 'idle' };

/**
 * (1) NOE FEILER UNDER INNSENDING — a service the app depends on does not
 * answer for a moment, partway through «Send inn».
 *
 *  - v8 saves the process state only after every hook has run, so the user
 *    never moves: they stay on the same page with the toast. Nothing retries by
 *    itself: the form is only sent because Kari tries again, and a retry runs
 *    every hook of the transition from the start. The comparison ends on who
 *    did the retrying, not on duplicates — v9 is at-least-once, so a duplicate
 *    is not a contrast the deck can draw.
 *  - v9 retries the step automatically, and a completed step is not run again.
 */
export const FEIL: Scenario = {
  name: 'feil',
  title: 'Hva skjer når noe feiler?',
  headline: 'En tjeneste appen er avhengig av, er nede en kort stund.',
  frame: 'skjema.altinn.no',
  v8: {
    start: READY,
    beats: [
      { id: 'send', text: 'Kari trykker «Send inn»', status: 'running', screen: SENDING },
      { id: 'fail', text: 'En tjeneste er nede', status: 'fail' },
      { id: 'seen', text: 'Kari får en teknisk feilmelding', status: 'fail', screen: V8_SERVICE_DOWN },
      { id: 'retry', text: 'Hun må prøve på nytt selv', status: 'wait' },
      { id: 'again', text: 'Alt kjøres på nytt fra start', status: 'fail' },
      {
        id: 'retried',
        text: 'Sendt, fordi Kari prøvde igjen',
        status: 'wait',
        screen: { title: 'Kvittering klar', body: 'Etter at Kari prøvde igjen.', tone: 'wait' },
      },
    ],
    outcome: 'Skjemaet ble bare sendt fordi Kari prøvde igjen.',
  },
  v9: {
    start: READY,
    beats: [
      { id: 'send', text: 'Kari trykker «Send inn»', status: 'running', screen: SENDING },
      { id: 'fail', text: 'En tjeneste er nede', status: 'fail' },
      { id: 'seen', text: 'Kari får vite at vi prøver igjen', status: 'running', screen: V9_TROUBLE },
      { id: 'retry', text: 'Plattformen prøver igjen selv', status: 'running' },
      { id: 'only', text: 'Bare det som feilet, kjøres igjen', status: 'ok' },
      { id: 'end', text: 'Kvitteringen er klar', status: 'ok', screen: RECEIPT },
    ],
    outcome: 'Kari trengte ikke å gjøre noe.',
  },
  takeaway:
    'I v8 er det brukeren som prøver igjen. I v9 gjør plattformen det, og det som er fullført, kjøres ikke på nytt.',
};

/**
 * (2) KARI LUKKER SIDEN — Kari closes the tab before the submission is done,
 * and a service the app depends on does not answer while she is away.
 *
 *  - v8 runs the transition inside Kari's own request. The server does not
 *    abort it when she leaves (the task-end work never sees the request's
 *    cancellation token), so it carries on — but if something fails after she
 *    has gone, nobody retries and nobody tells her. The process state is saved
 *    last, so the instance stays where it was: still a draft.
 *  - v9 hands the transition to the process engine, which owns it whether or
 *    not anyone is watching. The waiting view says it is safe to close the
 *    page (`process_workflow.still_working`), the engine retries, and the
 *    finished instance is in her inbox when she looks.
 */
export const LUKKER: Scenario = {
  name: 'lukker',
  title: 'Kari lukker siden',
  headline: 'Kari går fra skjemaet før det er sendt, og en tjeneste svarer ikke.',
  frame: 'skjema.altinn.no',
  v8: {
    start: READY,
    beats: [
      { id: 'send', text: 'Kari trykker «Send inn»', status: 'running', screen: SENDING },
      { id: 'close', text: 'Det tar tid, og Kari lukker siden', status: 'wait', screen: CLOSED },
      { id: 'fail', text: 'En tjeneste svarer ikke', status: 'fail' },
      { id: 'noretry', text: 'Ingen prøver igjen', status: 'fail' },
      {
        id: 'unsent',
        text: 'Skjemaet er ikke sendt',
        status: 'fail',
        screen: { title: 'Fortsatt et utkast', body: 'Skjemaet ble aldri sendt.', tone: 'bad' },
      },
      { id: 'unknown', text: 'Kari får ikke vite det', status: 'fail' },
    ],
    outcome: 'Kari tror skjemaet er sendt. Det er det ikke.',
  },
  v9: {
    start: READY,
    beats: [
      { id: 'send', text: 'Kari trykker «Send inn»', status: 'running', screen: SENDING },
      { id: 'close', text: 'Siden sier at hun kan lukke den', status: 'running', screen: V9_WORKING },
      { id: 'fail', text: 'En tjeneste svarer ikke', status: 'fail', screen: CLOSED },
      { id: 'retry', text: 'Plattformen prøver igjen selv', status: 'running' },
      { id: 'done', text: 'Skjemaet blir levert', status: 'ok' },
      {
        id: 'receipt',
        text: 'Kvitteringen ligger i innboksen',
        status: 'ok',
        screen: { title: 'Kvittering klar', body: 'Ligger i innboksen.', tone: 'ok' },
      },
    ],
    outcome: 'Kari kunne gå. Arbeidet gjorde seg ferdig.',
  },
  takeaway: 'I v9 er det plattformen som gjør jobben, ikke nettleseren. Brukeren kan gå fra siden.',
};

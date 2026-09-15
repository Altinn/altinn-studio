import { ScenarioStage, type Scenario } from './parts';
import type { SimProps } from './types';

/**
 * (1) INNBYGGEREN — the server restarts mid-submit.
 *
 * The same accident on both sides; the only question the scene asks is what it
 * costs the person who pressed the button. v8: an error page and a phone call.
 * v9: a waiting screen, a new server picking the work up where it stopped, and
 * a receipt.
 *
 * Accuracy (CONTENT.md §1):
 *  - v8 has no durable record of an in-flight transition, and the side effects
 *    run *before* the process state is saved (§5), so «ukjent tilstand» is
 *    literal, not rhetorical.
 *  - v9's steps are durable rows; a worker whose heartbeat goes 30 s stale is
 *    reclaimed by another worker, which continues from the last completed step
 *    (§11, §12). A completed step is never re-run (Ordliste: «Steg»).
 *  - The processing view «Vi jobber med skjemaet ditt» is the real text (§22) —
 *    but note the guardrail: on `main` the *submitting* tab shows its own button
 *    spinner, and it is the reloaded tab that shows the processing view. The
 *    scene therefore switches to it only *after* the connection breaks, which is
 *    exactly what a tab that comes back does today.
 *  - Closing row says the receipt came once, about this run — never «umulig».
 */
const SCENARIO: Scenario = {
  name: 'innbygger',
  headline: 'Serveren restarter midt i innsendingen',
  icon: 'server',
  device: 'phone',
  frame: { v8: 'skjema.altinn.no', v9: 'skjema.altinn.no' },
  // The very first thing the room sees of a simulation. It has to read as a
  // phone screen at thirty metres, so the opening state carries the real primary
  // button rather than the words «Send inn» set as a heading — a label on its own
  // is not something an audience recognises as a thing you press.
  start: {
    v8: {
      title: 'Klar til å sende',
      body: 'Kari har fylt ut skjemaet.',
      tone: 'idle',
      button: { label: 'Send inn' },
    },
    v9: {
      title: 'Klar til å sende',
      body: 'Kari har fylt ut skjemaet.',
      tone: 'idle',
      button: { label: 'Send inn' },
    },
  },
  divergeAt: 2,
  beats: [
    {
      id: 'send',
      gap: 1500,
      label: 'Kari trykker Send inn',
      v8: { text: 'Kari trykker «Send inn»', status: 'running' },
      v9: { text: 'Kari trykker «Send inn»', status: 'running' },
      v8Screen: { title: 'Sender inn …', body: 'Dette tar noen sekunder.', tone: 'busy' },
      v9Screen: { title: 'Sender inn …', body: 'Dette tar noen sekunder.', tone: 'busy' },
    },
    {
      id: 'restart',
      gap: 2100,
      label: 'Serveren restarter',
      v8: { text: 'Serveren restarter midt i arbeidet', status: 'fail' },
      v9: { text: 'Serveren restarter midt i arbeidet', status: 'fail' },
    },
    {
      id: 'screen',
      gap: 2200,
      label: 'Det Kari ser',
      v8: { text: 'Skjermen sier «Noe gikk galt»', status: 'fail' },
      v9: { text: 'Skjermen sier at vi jobber med saken', status: 'running' },
      v8Screen: { title: 'Noe gikk galt', body: 'Prøv igjen senere.', tone: 'bad' },
      v9Screen: {
        title: 'Vi jobber med skjemaet ditt',
        body: 'Dette kan ta litt tid.',
        tone: 'busy',
      },
    },
    {
      id: 'takeover',
      gap: 2200,
      label: 'Hvem rydder opp',
      v8: { text: 'Gikk det gjennom? Kari vet ikke', status: 'fail' },
      v9: { text: 'En annen server tar over der den slapp', status: 'running' },
    },
    {
      id: 'once',
      gap: 2200,
      label: 'Ingenting gjøres dobbelt',
      v8: { text: 'Hun ringer veiledningen for å spørre', status: 'fail' },
      v9: { text: 'Det som alt var gjort, gjøres ikke om igjen', status: 'ok' },
    },
    {
      id: 'end',
      gap: 2300,
      label: 'Utfallet',
      v8: { text: 'Ukjent tilstand — noen må rydde opp', status: 'fail', at: 'neste dag' },
      v9: { text: 'Kvitteringen er klar — og kom bare én gang', status: 'ok' },
      v8Screen: { title: 'Ingen kvittering', body: 'Kari må sende inn på nytt.', tone: 'bad' },
      v9Screen: { title: 'Kvittering klar', body: 'Skjemaet er levert.', tone: 'ok' },
    },
  ],
  takeaway: 'Brukeren mister aldri arbeidet — en restart koster litt ventetid, ikke et nytt forsøk.',
  endHold: 2600,
};

export function SimInnbygger({ autoplay = true }: SimProps) {
  return <ScenarioStage scenario={SCENARIO} autoplay={autoplay} />;
}

export default SimInnbygger;

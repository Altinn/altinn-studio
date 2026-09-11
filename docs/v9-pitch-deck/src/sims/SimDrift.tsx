import { ScenarioStage, type Scenario } from './parts';
import type { SimProps } from './types';

/**
 * (3) DRIFTSVAKTA — a step fails for real, at three in the morning.
 *
 * The failure is the same on both sides. What differs is the night, and the
 * morning: a wall of log lines and a manual clean-up, or a dashboard row that
 * names the step, the attempts and the reason — and resumes it.
 *
 * Accuracy (CONTENT.md §1):
 *  - The failure is a non-retryable status, so «nytt forsøk hjelper ikke» is
 *    literally true: the engine stops rather than hammering (§16). Because it is
 *    non-retryable there is exactly ONE attempt in the history — the engine never
 *    got to a second.
 *  - The status *code* stays on the v8 log wall and never appears on the v9
 *    dashboard. That is the whole point of the pair: the left column hands the
 *    duty engineer «422» to decode, the right column has already decoded it into
 *    «Avvist av mottaker». Slide 12 is where a code is allowed on screen, because
 *    that slide explains the dashboard; these scenes only have 2 s per beat.
 *  - The dashboard shows the per-step pipeline, a step modal with the full error
 *    history (each entry: retryable/non-retryable, HTTP status, timestamp,
 *    message) and operator actions that call the same public API — Retry
 *    (resume), Retry now / Check now, Fail (§20). The button is labelled «Kjør
 *    på nytt», the same wording slide 12 uses, to keep it apart from the *user's*
 *    «Prøv igjen» (§22).
 *  - A terminally failed workflow gives the user a support-reference page (§22).
 *  - v8's counterpart is the log hunt of slide 7 and the manually drained queue
 *    of §8.
 */
const SCENARIO: Scenario = {
  name: 'drift',
  headline: 'Et steg feiler for alvor klokka 03:00',
  icon: 'bell',
  device: 'laptop',
  frame: { v8: 'Vakttelefon · logger', v9: 'Prosessmotor · dashbord' },
  start: {
    v8: { title: 'Rolig natt', body: 'Ingenting å se.', tone: 'idle' },
    v9: {
      title: 'Aktive kjeder',
      tone: 'idle',
      rows: [
        { label: 'skjema-a · 4f2a…', value: 'Fullført', tone: 'ok' },
        { label: 'skjema-b · 7d31…', value: 'Kjører', tone: 'busy' },
      ],
    },
  },
  divergeAt: 1,
  beats: [
    {
      id: 'fails',
      gap: 1600,
      label: 'Steget feiler',
      v8: { text: 'Et steg feiler — nytt forsøk hjelper ikke', status: 'fail', at: '03:02' },
      v9: { text: 'Et steg feiler — nytt forsøk hjelper ikke', status: 'fail', at: '03:02' },
      v8Screen: {
        title: 'Varsel: feil i app-en',
        tone: 'bad',
        mono: true,
        rows: [
          { label: '03:02  error  Unhandled exception' },
          { label: '03:02  warn   task ended with 422' },
          { label: '03:05  error  Unhandled exception' },
        ],
      },
      v9Screen: {
        title: 'Steg 4 · Arkivering',
        tone: 'bad',
        rows: [
          { label: 'Status', value: 'Feilet', tone: 'bad' },
          { label: 'Årsak', value: 'Avvist av mottaker', tone: 'bad' },
        ],
      },
    },
    {
      id: 'paged',
      gap: 2200,
      label: 'Vakttelefonen ringer',
      v8: { text: 'Vakttelefonen ringer. Noen må opp.', status: 'fail', at: '03:04' },
      v9: { text: 'Feilen er skrevet ned med tid og årsak', status: 'ok', at: '03:02' },
    },
    {
      id: 'logs',
      gap: 2200,
      label: 'Leter i loggene',
      v8: { text: 'Leter i loggene: hvilken app, hvilken sak?', status: 'fail' },
      v9: { text: 'Brukeren får en referanse hun kan oppgi', status: 'ok' },
      v8Screen: {
        title: 'Hvilke saker er rammet?',
        tone: 'bad',
        mono: true,
        rows: [
          { label: '$ grep -c "Unhandled" app.log' },
          { label: '  41' },
          { label: '$ hvilke instanser? ukjent' },
        ],
      },
    },
    {
      id: 'scope',
      gap: 2200,
      label: 'Hvor mange står fast',
      v8: { text: 'Hvor mange andre står fast? Ingen vet.', status: 'fail' },
      v9: { text: 'Dashbordet viser steget og hele feilhistorikken', status: 'ok' },
      v9Screen: {
        title: 'Steg 4 · Arkivering',
        tone: 'bad',
        rows: [
          { label: 'Status', value: 'Feilet', tone: 'bad' },
          { label: 'Feilhistorikk', value: '1 forsøk · avvist', tone: 'bad' },
        ],
        button: { label: 'Kjør på nytt' },
      },
    },
    {
      id: 'resume',
      gap: 2200,
      label: 'Kjør på nytt',
      v8: { text: 'Neste morgen: manuell opprydding, én og én', status: 'fail', at: 'kl. 08' },
      v9: { text: 'Ett trykk: «Kjør på nytt» — steget fortsetter', status: 'ok', at: 'kl. 08' },
      v8Screen: {
        title: 'Manuell opprydding',
        tone: 'bad',
        mono: true,
        rows: [
          { label: '$ sak 1 av 41 …' },
          { label: '  hva ble gjort? hva ble ikke gjort?' },
          { label: '  PDF finnes. Forsendelse: ukjent.' },
        ],
      },
      v9Screen: {
        title: 'Steg 4 · Arkivering',
        tone: 'busy',
        rows: [
          { label: 'Status', value: 'Kjører igjen', tone: 'busy' },
          { label: 'Fortsetter fra', value: 'Steg 4', tone: 'idle' },
        ],
        button: { label: 'Kjør på nytt', pressed: true },
      },
    },
    {
      id: 'end',
      gap: 2300,
      label: 'Utfallet',
      v8: { text: 'Hva ble gjort, og hva ikke? Noen må gjette.', status: 'fail' },
      v9: { text: 'Steget er fullført. Prosessen gikk videre.', status: 'ok' },
      v9Screen: {
        title: 'Steg 4 · Arkivering',
        tone: 'ok',
        rows: [
          { label: 'Status', value: 'Fullført', tone: 'ok' },
          { label: 'Tid brukt', value: '1,9 s', tone: 'idle' },
        ],
      },
    },
  ],
  takeaway: 'Feil skjer uansett — forskjellen er om noen må lete, eller bare se og trykke.',
  endHold: 2600,
};

export function SimDrift({ autoplay = true }: SimProps) {
  return <ScenarioStage scenario={SCENARIO} autoplay={autoplay} />;
}

export default SimDrift;

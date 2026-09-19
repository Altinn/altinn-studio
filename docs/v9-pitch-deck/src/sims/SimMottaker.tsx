import { ScenarioStage, type Scenario } from './parts';
import type { SimProps } from './types';

/**
 * (2) MOTTAKEREN — the receiving system is down for a while.
 *
 * The retry story the deck has always told, now as one person's day rather than
 * a packet diagram: a status card for the receiving system, and one line for
 * what the citizen is left with.
 *
 * Accuracy (CONTENT.md §1):
 *  - v8 turns the downstream failure into the user's own error; a shipment that
 *    fails halfway may already have uploaded attachments on the other side (§6),
 *    and nothing re-drives it.
 *  - v9: waiting is a first-class, non-failure state — the step parks, holds no
 *    worker and records no error (§18); a real failure retries with exponential
 *    backoff, 1 s base, ±20 % jitter (§16).
 *  - Never name a vendor: «mottakersystemet» throughout.
 */
const SCENARIO: Scenario = {
  name: 'mottaker',
  headline: 'Mottakersystemet er nede en stund',
  icon: 'send',
  device: 'card',
  frame: { v8: 'Forsendelse · status', v9: 'Forsendelse · status' },
  start: {
    v8: {
      title: 'Forsendelsen skal ut',
      tone: 'idle',
      rows: [
        { label: 'Mottakersystem', value: 'Tilgjengelig', tone: 'ok' },
        { label: 'Innbyggeren', value: 'Venter på svar', tone: 'idle' },
      ],
    },
    v9: {
      title: 'Forsendelsen skal ut',
      tone: 'idle',
      rows: [
        { label: 'Mottakersystem', value: 'Tilgjengelig', tone: 'ok' },
        { label: 'Innbyggeren', value: 'Venter på svar', tone: 'idle' },
      ],
    },
  },
  divergeAt: 2,
  beats: [
    {
      id: 'send',
      gap: 1500,
      label: 'Forsendelsen ut',
      v8: { text: 'Skjemaet er ferdig — forsendelsen skal ut', status: 'running' },
      v9: { text: 'Skjemaet er ferdig — forsendelsen skal ut', status: 'running' },
      v8Screen: {
        title: 'Sender forsendelsen',
        tone: 'busy',
        rows: [
          { label: 'Mottakersystem', value: 'Tilgjengelig', tone: 'ok' },
          { label: 'Innbyggeren', value: 'Venter på svar', tone: 'idle' },
        ],
      },
      v9Screen: {
        title: 'Sender forsendelsen',
        tone: 'busy',
        rows: [
          { label: 'Mottakersystem', value: 'Tilgjengelig', tone: 'ok' },
          { label: 'Innbyggeren', value: 'Venter på svar', tone: 'idle' },
        ],
      },
    },
    {
      id: 'down',
      gap: 2100,
      label: 'Mottakeren svarer ikke',
      v8: { text: 'Mottakersystemet svarer ikke', status: 'fail' },
      v9: { text: 'Mottakersystemet svarer ikke', status: 'fail' },
      v8Screen: {
        title: 'Ingen kontakt med mottaker',
        tone: 'bad',
        rows: [
          { label: 'Mottakersystem', value: 'Utilgjengelig', tone: 'bad' },
          { label: 'Innbyggeren', value: 'Venter på svar', tone: 'idle' },
        ],
      },
      v9Screen: {
        title: 'Ingen kontakt med mottaker',
        tone: 'bad',
        rows: [
          { label: 'Mottakersystem', value: 'Utilgjengelig', tone: 'bad' },
          { label: 'Innbyggeren', value: 'Venter på svar', tone: 'idle' },
        ],
      },
    },
    {
      id: 'user',
      gap: 2200,
      label: 'Det brukeren merker',
      v8: { text: 'Kari får «Noe gikk galt» og må vente', status: 'fail' },
      v9: { text: 'Kari er ferdig — resten skjer i bakgrunnen', status: 'ok' },
      v8Screen: {
        title: 'Innsendingen feilet',
        tone: 'bad',
        rows: [
          { label: 'Mottakersystem', value: 'Utilgjengelig', tone: 'bad' },
          { label: 'Innbyggeren', value: 'Fikk feilmelding', tone: 'bad' },
        ],
      },
      v9Screen: {
        title: 'Forsendelsen står i kø',
        tone: 'busy',
        rows: [
          { label: 'Mottakersystem', value: 'Utilgjengelig', tone: 'bad' },
          { label: 'Innbyggeren', value: 'Ferdig', tone: 'ok' },
        ],
      },
    },
    {
      id: 'wait',
      gap: 2200,
      label: 'Venting er ikke feil',
      v8: { text: 'Vedlegg kan alt ligge halvveis hos mottaker', status: 'fail' },
      v9: { text: 'Venting er ikke feil — motoren sjekker igjen', status: 'wait' },
    },
    {
      id: 'retry',
      gap: 2200,
      label: 'Nytt forsøk',
      v8: { text: 'Ingen prøver igjen — noen må oppdage det', status: 'fail' },
      v9: { text: 'Nytt forsøk med voksende pause: 1 s, 2 s, 4 s', status: 'wait' },
    },
    {
      id: 'done',
      gap: 2300,
      label: 'Bekreftet',
      v8: { text: 'Kari må sende inn hele skjemaet på nytt', status: 'fail', at: 'senere' },
      v9: { text: 'Mottakeren er oppe — leveransen er bekreftet', status: 'ok', at: '6 min' },
      v8Screen: {
        title: 'Ingen kvittering',
        tone: 'bad',
        rows: [
          { label: 'Mottakersystem', value: 'Tilgjengelig', tone: 'ok' },
          { label: 'Innbyggeren', value: 'Må sende inn på nytt', tone: 'bad' },
        ],
      },
      v9Screen: {
        title: 'Levert og bekreftet',
        tone: 'ok',
        rows: [
          { label: 'Mottakersystem', value: 'Tilgjengelig', tone: 'ok' },
          { label: 'Innbyggeren', value: 'Ferdig for lenge siden', tone: 'ok' },
        ],
      },
    },
  ],
  takeaway: 'Når mottakeren er nede, er det motoren som venter — ikke innbyggeren.',
  endHold: 2600,
};

export function SimMottaker({ autoplay = true }: SimProps) {
  return <ScenarioStage scenario={SCENARIO} autoplay={autoplay} />;
}

export default SimMottaker;

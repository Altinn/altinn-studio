import type { ChatThread } from '../types/ChatThread';
import { MessageAuthor } from '../types/MessageAuthor';
import { mockTexts } from './mockTexts';

export const mockChatThreads: ChatThread[] = [
  {
    id: '1',
    title: 'Koble komponenter til datamodell',
    messages: [
      {
        author: MessageAuthor.Assistant,
        content: mockTexts.assistantFirstMessage,
        timestamp: new Date('2025-10-01T09:59:00'),
      },
      {
        author: MessageAuthor.User,
        content:
          'Jeg har lastet opp en datamodell i appen min, men jeg er usikker på hvordan jeg kobler skjemakomponentene til feltene i datamodellen.\n\nJeg har et Input-felt for fornavn og etternavn, men dataene lagres ikke når jeg tester skjemaet.',
        timestamp: new Date('2025-10-01T10:00:00'),
      },
      {
        author: MessageAuthor.Assistant,
        content:
          'For at data skal lagres må komponentene være koblet til datamodellen. I Altinn Studio gjør du dette ved å sette dataModelBindings på hver komponent.\n\nFor et Input-felt setter du simpleBinding til å peke på riktig felt i datamodellen. For eksempel hvis datamodellen har et felt kalt "fornavn", setter du simpleBinding til "fornavn". Du kan også bruke punktnotasjon for nestede felter, som "person.fornavn".\n\nHusk at hvis komponenten er inne i en repeterende gruppe, må gruppen også være konfigurert som repeterende i layout-filen med type: "RepeatingGroup" og riktig dataModelBindings. Ellers vil lagringen feile.',
        timestamp: new Date('2025-10-01T10:01:00'),
      },
      {
        author: MessageAuthor.User,
        content:
          'Takk! Hva hvis jeg har et adressefelt som er nestet i datamodellen under "person.adresse.gate"?',
        timestamp: new Date('2025-10-01T10:02:00'),
      },
      {
        author: MessageAuthor.Assistant,
        content:
          'Da bruker du bare punktnotasjon i simpleBinding. Sett dataModelBindings.simpleBinding til "person.adresse.gate". Altinn Studio støtter flere nivåer av nesting i datamodellen.\n\nEn god praksis er å først sjekke strukturen i datamodellen din (XSD eller JSON Schema) for å se nøyaktig hvilke felter som finnes og hvordan de er strukturert. Du kan også bruke lookup-funksjonen i dynamiske uttrykk for å hente verdier direkte fra datamodellen.',
        timestamp: new Date('2025-10-01T10:03:00'),
      },
    ],
  },
  {
    id: '2',
    title: 'Sette opp dynamiske kodelister',
    messages: [
      {
        author: MessageAuthor.Assistant,
        content: mockTexts.assistantFirstMessage,
        timestamp: new Date('2025-09-30T14:29:00'),
      },
      {
        author: MessageAuthor.User,
        content:
          'Jeg trenger en nedtrekksmeny som viser kommuner basert på hvilket fylke brukeren har valgt. Hvordan kan jeg lage en slik dynamisk kodeliste i Altinn Studio?',
        timestamp: new Date('2025-09-30T14:30:00'),
      },
      {
        author: MessageAuthor.Assistant,
        content:
          'Altinn Studio støtter dynamiske kodelister som kan genereres runtime basert på andre verdier i skjemaet. For ditt brukstilfelle kan du bruke query parameters til å filtrere kommunelisten.\n\nDu må først sette opp en options-konfigurasjon som peker på et API-endepunkt som returnerer kommuner. Deretter kan du bruke mapping-funksjonen til å sende fylke som en query parameter. På backend kan du implementere logikk i InstanceAppOptionsProvider for å filtrere kommunelisten basert på det valgte fylket.\n\nEn alternativ tilnærming er å bruke secure options hvis dataene inneholder sensitiv informasjon, eller å bruke filterering på klientsiden hvis du har alle kommuner tilgjengelig og bare vil vise relevante basert på fylke.',
        timestamp: new Date('2025-09-30T14:31:00'),
      },
    ],
  }
];

import type { ChatThread } from '../types/ChatThread';
import { MessageAuthor } from '../types/MessageAuthor';

export function getMockChatThreads(): ChatThread[] {
  return [
    {
      id: '1',
      title: 'Lag påloggingsskjema',
      timestamp: new Date('2025-10-01T10:00:00'),
      messages: [
        {
          author: MessageAuthor.User,
          content: 'Kan du hjelpe meg med å lage et påloggingsskjema?',
        },
        {
          author: MessageAuthor.Assistant,
          content: 'Jeg kan hjelpe deg med å lage et påloggingsskjema. Hvilke felter trenger du?',
        },
        {
          author: MessageAuthor.User,
          content: 'Jeg trenger e-post og passord-felter',
        },
      ],
    },
    {
      id: '2',
      title: 'Fiks valideringsfeil',
      timestamp: new Date('2025-09-30T14:30:00'),
      messages: [
        {
          author: MessageAuthor.User,
          content: 'Det er en valideringsfeil i skjemaet mitt',
        },
        {
          author: MessageAuthor.Assistant,
          content: 'La meg hjelpe deg med å feilsøke det. Kan du dele feilmeldingen?',
        },
      ],
    },
    {
      id: '3',
      title: 'Legg til ny komponent',
      timestamp: new Date('2025-09-29T09:15:00'),
      messages: [
        {
          author: MessageAuthor.User,
          content: 'Jeg vil legge til en ny nedtrekksmeny-komponent',
        },
      ],
    },
  ];
}

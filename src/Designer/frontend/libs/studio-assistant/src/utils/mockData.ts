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
          content:
            'Kan du hjelpe meg med å lage et påloggingsskjema? Jeg jobber med en ny applikasjon og trenger å implementere autentisering.\n\nJeg har allerede satt opp en database og backend-struktur, men trenger et brukervennlig skjema på frontend-siden.',
        },
        {
          author: MessageAuthor.Assistant,
          content:
            'Jeg kan absolutt hjelpe deg med å lage et påloggingsskjema. For å gi deg den beste løsningen, trenger jeg litt mer informasjon om dine behov. Det er flere forskjellige tilnærminger vi kan ta avhengig av hvilke krav du har til sikkerhet, brukervennlighet og funksjonalitet.\n\nHvilke felter trenger du i skjemaet? Typiske påloggingsskjemaer inneholder e-post og passord, men noen applikasjoner bruker brukernavn i stedet for e-post. Jeg kan også implementere to-faktor autentisering hvis det er relevant for din applikasjon. Det er viktig å tenke på sikkerhet fra starten av, spesielt når det gjelder håndtering av passord og brukerdata.\n\nVil du også ha funksjonalitet for "husk meg" eller "glemt passord"? Jeg kan også legge til validering og feilhåndtering hvis du ønsker det. Vi bør også diskutere hvordan skjemaet skal se ut visuelt - skal det følge et eksisterende designsystem, eller trenger du hjelp med styling også? Jeg kan sørge for at skjemaet er responsivt og fungerer godt på både desktop og mobile enheter.',
        },
        {
          author: MessageAuthor.User,
          content:
            'Jeg trenger e-post og passord-felter med validering. Det hadde vært fint med en "husk meg" checkbox også.\n\nKan du også sørge for at passordet er skjult, men med mulighet til å vise det ved å klikke på et øye-ikon? Og legg gjerne til en "glemt passord" lenke.',
        },
        {
          author: MessageAuthor.Assistant,
          content:
            'Perfekt! Jeg skal lage et komplett påloggingsskjema med alle disse funksjonene. Skjemaet vil inneholde e-post og passord-felter med validering for riktig e-postformat og minimum passordlengde. Jeg bruker HTML5 validering kombinert med JavaScript for å gi brukerne umiddelbar feedback når de fyller ut skjemaet. Dette gir en bedre brukeropplevelse enn å vente til de sender inn skjemaet.\n\nJeg legger til en "husk meg" checkbox som du kan bruke til å lagre login-informasjon i en sikker cookie eller localStorage. Passordfeltet vil være skjult som standard med type="password", men brukeren kan toggle synlighet med et øye-ikon. Dette er spesielt nyttig for brukere som vil verifisere at de har skrevet inn riktig passord. Jeg implementerer dette med en state-variabel som bytter mellom "password" og "text" input-typer.\n\nJeg inkluderer også en "glemt passord" lenke under skjemaet som kan lenke til en egen side for passordgjenoppretting. Alle feltene vil ha god tilgjengelighet med riktige ARIA-labels og feilmeldinger som vises tydelig dersom valideringen feiler. Skjemaet vil også ha fokus-states og keyboard navigation for å sikre at det fungerer godt for alle brukere, inkludert de som bruker skjermlesere eller navigerer med tastatur.',
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
          content:
            'Det er en valideringsfeil i skjemaet mitt som jeg ikke helt forstår. Når brukere prøver å sende inn et skjema, får de feilmelding selv om alle feltene ser ut til å være utfylt korrekt.\n\nFeilmeldingen sier noe om at "telefonnummer må være gyldig", men jeg har sjekket formatet flere ganger og det ser riktig ut.',
        },
        {
          author: MessageAuthor.Assistant,
          content:
            'La meg hjelpe deg med å feilsøke dette. Valideringsproblemer med telefonnummer kan ofte skyldes uventede tegn eller formatering som ikke matcher regex-mønsteret ditt. Dette er et veldig vanlig problem fordi telefonnummer kan formateres på mange forskjellige måter, og brukere forventer ofte at systemet skal akseptere flere formater. For eksempel kan noen brukere skrive "+47 123 45 678", mens andre skriver "12345678" uten landkode eller mellomrom.\n\nKan du dele feilmeldingen du får, og fortelle meg hvilket format du forventer for telefonnummeret? For eksempel, skal det være med landkode, mellomrom, eller bindestreker? Det kan også være at valideringen din ikke håndterer spesialtegn som mellomrom, parenteser eller bindestreker som brukere ofte inkluderer når de skriver telefonnummer. Jeg kan hjelpe deg med å lage en mer fleksibel validering som fjerner disse tegnene før den sjekker om nummeret er gyldig.\n\nDet kan også være nyttig å se valideringsregelen du bruker, så jeg kan identifisere hvor problemet ligger og foreslå en løsning. Hvis du bruker en regex, kan jeg hjelpe deg med å forbedre den slik at den aksepterer flere formater. Alternativt kan vi implementere en løsning som normaliserer input ved å fjerne alle ikke-numeriske tegn før validering, slik at brukere kan skrive nummeret sitt i det formatet de foretrekker.',
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
          content:
            'Jeg vil legge til en ny nedtrekksmeny-komponent i skjemaet mitt. Brukerne skal kunne velge sitt fylke fra en liste.\n\nJeg har en liste over alle norske fylker som jeg vil bruke som alternativer. Komponenten bør også støtte søk, slik at brukere kan skrive for å finne sitt fylke raskt.',
        },
      ],
    },
  ];
}

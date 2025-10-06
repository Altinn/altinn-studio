import type { ChatThread } from '../types/ChatThread';
import { MessageAuthor } from '../types/MessageAuthor';

export function getMockChatThreads(): ChatThread[] {
  return [
    {
      id: '1',
      title: 'Koble komponenter til datamodell',
      timestamp: new Date('2025-10-01T10:00:00'),
      messages: [
        {
          author: MessageAuthor.User,
          content:
            'Jeg har lastet opp en datamodell i appen min, men jeg er usikker på hvordan jeg kobler skjemakomponentene til feltene i datamodellen.\n\nJeg har et Input-felt for fornavn og etternavn, men dataene lagres ikke når jeg tester skjemaet.',
        },
        {
          author: MessageAuthor.Assistant,
          content:
            'For at data skal lagres må komponentene være koblet til datamodellen. I Altinn Studio gjør du dette ved å sette dataModelBindings på hver komponent.\n\nFor et Input-felt setter du simpleBinding til å peke på riktig felt i datamodellen. For eksempel hvis datamodellen har et felt kalt "fornavn", setter du simpleBinding til "fornavn". Du kan også bruke punktnotasjon for nestede felter, som "person.fornavn".\n\nHusk at hvis komponenten er inne i en repeterende gruppe, må gruppen også være konfigurert som repeterende i layout-filen med type: "RepeatingGroup" og riktig dataModelBindings. Ellers vil lagringen feile.',
        },
        {
          author: MessageAuthor.User,
          content:
            'Takk! Hva hvis jeg har et adressefelt som er nestet i datamodellen under "person.adresse.gate"?',
        },
        {
          author: MessageAuthor.Assistant,
          content:
            'Da bruker du bare punktnotasjon i simpleBinding. Sett dataModelBindings.simpleBinding til "person.adresse.gate". Altinn Studio støtter flere nivåer av nesting i datamodellen.\n\nEn god praksis er å først sjekke strukturen i datamodellen din (XSD eller JSON Schema) for å se nøyaktig hvilke felter som finnes og hvordan de er strukturert. Du kan også bruke lookup-funksjonen i dynamiske uttrykk for å hente verdier direkte fra datamodellen.',
        },
      ],
    },
    {
      id: '2',
      title: 'Sette opp dynamiske kodelister',
      timestamp: new Date('2025-09-30T14:30:00'),
      messages: [
        {
          author: MessageAuthor.User,
          content:
            'Jeg trenger en nedtrekksmeny som viser kommuner basert på hvilket fylke brukeren har valgt. Hvordan kan jeg lage en slik dynamisk kodeliste i Altinn Studio?',
        },
        {
          author: MessageAuthor.Assistant,
          content:
            'Altinn Studio støtter dynamiske kodelister som kan genereres runtime basert på andre verdier i skjemaet. For ditt brukstilfelle kan du bruke query parameters til å filtrere kommunelisten.\n\nDu må først sette opp en options-konfigurasjon som peker på et API-endepunkt som returnerer kommuner. Deretter kan du bruke mapping-funksjonen til å sende fylke som en query parameter. På backend kan du implementere logikk i InstanceAppOptionsProvider for å filtrere kommunelisten basert på det valgte fylket.\n\nEn alternativ tilnærming er å bruke secure options hvis dataene inneholder sensitiv informasjon, eller å bruke filterering på klientsiden hvis du har alle kommuner tilgjengelig og bare vil vise relevante basert på fylke.',
        },
      ],
    },
    {
      id: '3',
      title: 'Legge til valideringsregler',
      timestamp: new Date('2025-09-29T09:15:00'),
      messages: [
        {
          author: MessageAuthor.User,
          content:
            'Jeg vil legge til validering på et beløpsfelt slik at brukere ikke kan sende inn skjemaet hvis beløpet er over 100 000 kr. Hvordan gjør jeg det i Altinn Studio?\n\nJeg vil også ha en soft validation som gir en advarsel hvis beløpet er over 50 000 kr, men som ikke hindrer innsending.',
        },
        {
          author: MessageAuthor.Assistant,
          content:
            'I Altinn Studio kan du implementere egendefinerte valideringsregler i backend. Du må opprette eller redigere ValidationHandler.cs i Logic-mappen.\n\nFor din harde validering (som blokkerer innsending) legger du til en valideringsregel i ValidateFormData-metoden som sjekker om beløpet er over 100 000. Hvis det er det, legger du til en ERROR-melding med AddModelError.\n\nFor soft validation (advarsler) bruker du samme metode, men setter severity til ValidationIssueSeverity.Warning. Disse vil vises til brukeren, men hindrer ikke innsending eller prosess-flytting. Du kan også bruke INFO eller SUCCESS for andre typer meldinger.\n\nValidering kjører automatisk når brukere prøver å sende inn data eller når prosessen flyttes til et nytt steg.',
        },
      ],
    },
    {
      id: '4',
      title: 'Bruk av repeterende grupper',
      timestamp: new Date('2025-09-28T11:20:00'),
      messages: [
        {
          author: MessageAuthor.User,
          content:
            'Jeg trenger at brukere skal kunne legge til flere barn i skjemaet. Hvordan setter jeg opp en repeterende gruppe for dette?',
        },
        {
          author: MessageAuthor.Assistant,
          content:
            'I Altinn Studio setter du opp en repeterende gruppe ved å først sørge for at datamodellen har en liste/array for barn. Deretter oppretter du en Group-komponent i layout-filen og setter type til "RepeatingGroup".\n\nDu må konfigurere maxCount for å begrense antall barn som kan legges til, og children-arrayet som inneholder id-ene til komponentene som skal være inne i gruppen. Husk å sette dataModelBindings.group til å peke på list-feltet i datamodellen.\n\nDu kan også konfigurere tableHeaders hvis du vil vise gruppen som en tabell, eller bruke edit.mode for å styre om brukere redigerer inline eller i et eget panel. Repeterende grupper støtter også dynamisk oppførsel som å skjule rader basert på betingelser med hiddenRow.',
        },
      ],
    },
    {
      id: '5',
      title: 'Konfigurere prosessflyt',
      timestamp: new Date('2025-09-27T16:45:00'),
      messages: [
        {
          author: MessageAuthor.User,
          content:
            'Appen min skal ha en prosess hvor brukeren først fyller ut et skjema (data-steg), så skal det gå til en bekreftelse-side, og til slutt en kvittering. Hvordan konfigurerer jeg dette i Altinn Studio?',
        },
        {
          author: MessageAuthor.Assistant,
          content:
            'Prosessflyten konfigureres i process.bpmn-filen som følger BPMN-standarden. I Altinn Studio kan du redigere prosessen visuelt eller i XML.\n\nFor din flyt trenger du å definere task-noder for hvert steg: data-steget hvor brukeren fyller ut skjemaet, confirmation-steget for bekreftelse, og et sluttledd. Mellom hvert steg har du sequence flows som definerer rekkefølgen.\n\nDu kan også bruke dynamiske uttrykk for å styre prosessflyten, for eksempel for å hoppe over steg basert på data. I tillegg kan du konfigurere tilgangskontroll på task-nivå for å definere hvem som har tilgang til hvilke steg og handlinger.',
        },
      ],
    },
    {
      id: '6',
      title: 'Legge til dynamiske uttrykk',
      timestamp: new Date('2025-09-26T13:10:00'),
      messages: [
        {
          author: MessageAuthor.User,
          content:
            'Jeg vil skjule et felt i skjemaet hvis brukeren har svart "Nei" på et annet felt. Hvordan gjør jeg det med dynamiske uttrykk i Altinn Studio?',
        },
      ],
    },
  ];
}

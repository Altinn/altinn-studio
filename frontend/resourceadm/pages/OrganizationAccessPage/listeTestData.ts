// tjeneste for å hente ut alle lister gitt miljø
export const TestLister = [
  {
    env: 'tt02',
    id: 1,
    navn: 'Gode fiskere',
  },
  {
    env: 'tt02',
    id: 2,
    navn: 'Banksvindlere',
  },
  {
    env: 'tt02',
    id: 3,
    navn: 'Kakespisere',
  },
  {
    env: 'prod',
    id: 11,
    navn: 'Gode fiskere',
  },
  {
    env: 'at22',
    id: 111,
    navn: 'Gode fiskere',
  },
  {
    env: 'at22',
    id: 333,
    navn: 'Kakespisere',
  },
  {
    env: 'at23',
    id: 3333,
    navn: 'Kakespisere',
  },
];

// tjeneste for å hente ut detaljer for en liste
export const ListMembers = [
  {
    listId: 1,
    name: 'Gode fiskere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
      {
        orgNr: '997532422',
        orgName: 'NORSK HELSENETT BEDRIFTSIDRETTSLAG',
        isUnderenhet: false,
      },
      {
        orgNr: '891611862',
        orgName: 'HYPERION',
        isUnderenhet: true,
      },
      {
        orgNr: '111611111',
        orgName: '<ikke funnet>',
        isUnderenhet: false,
      },
    ],
  },
  {
    listId: 2,
    name: 'Banksvindlere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
      {
        orgNr: '997532422',
        orgName: 'NORSK HELSENETT BEDRIFTSIDRETTSLAG',
        isUnderenhet: false,
      },
    ],
  },
  {
    listId: 3,
    name: 'Kakespisere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
  {
    listId: 11,
    name: 'Gode fiskere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
  {
    listId: 111,
    name: 'Gode fiskere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
  {
    listId: 111,
    name: 'Gode fiskere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
  {
    listId: 333,
    name: 'Kakespisere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
  {
    listId: 3333,
    name: 'Kakespisere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
];

// tjeneste for å hente ut alle lister en gitt ressurs er koblet til. Join inn navn i BFF?
export const ListConnections = [
  { resourceId: 'test-ressurs', env: 'tt02', list: 1, actions: ['read', 'write', 'sign'] },
  { resourceId: 'test-ressurs', env: 'tt02', list: 2, actions: ['read', 'instansiate'] },
  { resourceId: 'test-ressurs', env: 'prod', list: 11, actions: ['read', 'write'] },
  { resourceId: 'test-ressurs', env: 'at22', list: 333, actions: ['read'] },
];

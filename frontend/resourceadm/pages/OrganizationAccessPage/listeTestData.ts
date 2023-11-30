import {
  ResourceList,
  ResourceRightsRegistryList,
  ResourceRightsRegistryListWithMembers,
} from 'app-shared/types/ResourceAdm';

// tjeneste for å hente ut alle lister gitt miljø
export const TestLister: ResourceRightsRegistryList[] = [
  {
    env: 'tt02',
    id: 1,
    title: 'Gode fiskere',
  },
  {
    env: 'tt02',
    id: 2,
    title: 'Banksvindlere',
  },
  {
    env: 'tt02',
    id: 3,
    title: 'Kakespisere',
  },
  {
    env: 'prod',
    id: 11,
    title: 'Gode fiskere',
  },
  {
    env: 'at22',
    id: 111,
    title: 'Gode fiskere',
  },
  {
    env: 'at22',
    id: 333,
    title: 'Kakespisere',
  },
  {
    env: 'at23',
    id: 3333,
    title: 'Kakespisere',
  },
];

// tjeneste for å hente ut detaljer for en liste
export const ListMembers: ResourceRightsRegistryListWithMembers[] = [
  {
    id: 1,
    env: 'tt02',
    title: 'Gode fiskere',
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
    id: 2,
    env: 'tt02',
    title: 'Banksvindlere',
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
    id: 3,
    env: 'tt02',
    title: 'Kakespisere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
  {
    id: 11,
    env: 'prod',
    title: 'Gode fiskere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
  {
    id: 111,
    env: 'at22',
    title: 'Gode fiskere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
  {
    id: 333,
    env: 'at22',
    title: 'Kakespisere',
    members: [
      {
        orgNr: '991825827',
        orgName: 'DIGITALISERINGSDIREKTORATET',
        isUnderenhet: false,
      },
    ],
  },
  {
    id: 3333,
    env: 'at23',
    title: 'Kakespisere',
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
export const ListConnections: ResourceList[] = [
  { resourceId: 'test-ressurs', env: 'tt02', listId: 1, actions: ['read', 'write', 'sign'] },
  { resourceId: 'test-ressurs', env: 'tt02', listId: 2, actions: ['read', 'instansiate'] },
  { resourceId: 'test-ressurs', env: 'prod', listId: 11, actions: ['read', 'write'] },
  { resourceId: 'test-ressurs', env: 'at22', listId: 333, actions: ['read'] },
];

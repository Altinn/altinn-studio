import { PartyListResourceLink } from 'app-shared/types/ResourceAdm';

// tjeneste for å hente ut alle lister en gitt ressurs er koblet til. Join inn navn i BFF?
export const ListConnections: PartyListResourceLink[] = [
  { resourceId: 'test-ressurs', env: 'tt02', listId: '1', actions: ['read', 'write', 'sign'] },
  { resourceId: 'test-ressurs', env: 'tt02', listId: '2', actions: ['read', 'instansiate'] },
  { resourceId: 'test-ressurs', env: 'prod', listId: '11', actions: ['read', 'write'] },
  { resourceId: 'test-ressurs', env: 'at22', listId: '333', actions: ['read'] },
];

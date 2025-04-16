import type { ExternalResource } from 'app-shared/types/ExternalResource';

const externalResource1: ExternalResource = {
  source: 'org.ttd',
  type: 'code_list',
  id: 'code_list_1',
};

const externalResource2: ExternalResource = {
  source: 'org.ttd',
  type: 'text',
  id: 'code_list_2',
};

const externalResource3: ExternalResource = {
  source: 'org.ttd',
  type: 'code_list',
  id: 'code_list_3',
};

const externalResource4: ExternalResource = {
  source: 'org.ttd',
  type: 'image',
  id: 'code_list_4',
};

const externalResource5: ExternalResource = {
  source: 'org.ttd',
  type: 'code_list',
  id: 'code_list_5',
};

export const externalResources: ExternalResource[] = [
  externalResource1,
  externalResource2,
  externalResource3,
  externalResource4,
  externalResource5,
];

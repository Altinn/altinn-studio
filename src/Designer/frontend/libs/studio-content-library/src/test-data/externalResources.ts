import type { ExternalResource } from 'app-shared/types/ExternalResource';
import { LibraryContentType } from 'app-shared/enums/LibraryContentType';

const externalResource1: ExternalResource = {
  source: 'org.ttd',
  type: LibraryContentType.CodeList,
  id: 'code_list_1',
};

const externalResource2: ExternalResource = {
  source: 'org.ttd',
  type: LibraryContentType.TextResource,
  id: 'text_resource_1',
};

const externalResource3: ExternalResource = {
  source: 'org.ttd',
  type: LibraryContentType.CodeList,
  id: 'code_list_2',
};

const externalResource4: ExternalResource = {
  source: 'org.ttd',
  type: LibraryContentType.CodeList,
  id: 'code_list_3',
};

const externalResource5: ExternalResource = {
  source: 'org.ttd',
  type: LibraryContentType.CodeList,
  id: 'code_list_4',
};

export const externalResources: ExternalResource[] = [
  externalResource1,
  externalResource2,
  externalResource3,
  externalResource4,
  externalResource5,
];

import type { LibraryContentType } from '../enums/LibraryContentType';

export type ExternalResource = {
  source: string;
  type: LibraryContentType;
  id: string;
};

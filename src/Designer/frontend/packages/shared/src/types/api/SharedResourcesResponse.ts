import type { LibraryFile } from '../LibraryFile';

export interface SharedResourcesResponse {
  files: LibraryFile[];
  commitSha: string;
}

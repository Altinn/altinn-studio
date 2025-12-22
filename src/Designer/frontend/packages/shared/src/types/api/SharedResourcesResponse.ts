import type { BackendLibraryFile } from '../LibraryFile';

export interface SharedResourcesResponse {
  files: BackendLibraryFile[];
  commitSha: string;
}

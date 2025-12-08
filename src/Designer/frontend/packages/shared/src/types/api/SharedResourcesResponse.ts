import type { LibraryFile } from '../LibraryFile';

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

export interface SharedResourcesResponse {
  files: LibraryFile[];
  commitSha: string;
}

import type { LibraryFile } from 'app-shared/types/LibraryFile';

export interface SharedResources {
  files: LibraryFile<'content' | 'url'>[];
  commitSha: string;
}

import type { PagesConfig } from './PagesProps';
import type { ContentLibraryRouter } from './ContentLibraryRouter';

export type ContentLibraryConfig = {
  router: ContentLibraryRouter;
  pages: PagesConfig;
  heading: string;
};

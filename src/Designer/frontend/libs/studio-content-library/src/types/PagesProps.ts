import type { CodeListsWithTextResourcesPageProps } from '../ContentLibrary/LibraryBody/pages/CodeListsWithTextResourcesPage';
import type { PageName } from './PageName';
import type { ImagesPageProps } from '../ContentLibrary/LibraryBody/pages/ImagesPage';
import { CodeListsPageProps } from '../ContentLibrary/LibraryBody/pages/CodeListsPage';

export type PagePropsMap<P extends PageName> = {
  landingPage: {};
  codeLists: CodeListsPageProps;
  codeListsWithTextResources: CodeListsWithTextResourcesPageProps;
  images: ImagesPageProps;
}[P];

type GlobalPageConfig<T> = {
  props: T;
};

type AllPagesConfig = {
  [K in PageName]: GlobalPageConfig<PagePropsMap<K>>;
};

export type PagesConfig = Partial<AllPagesConfig>;

import type { CodeListsWithTextResourcesPageProps } from '../pages/CodeListsWithTextResources/CodeListsWithTextResourcesPage';
import type { PageName } from './PageName';
import type { ImagesPageProps } from '../pages/Images/ImagesPage';
import type { CodeListsPageProps } from '../pages/CodeLists/CodeListsPage';

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

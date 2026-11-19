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

export type PagesConfig = {
  [K in PageName]?: PagePropsMap<K>;
};

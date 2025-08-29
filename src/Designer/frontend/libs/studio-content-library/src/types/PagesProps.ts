import type { CodeListPageProps } from '../ContentLibrary/LibraryBody/pages/CodeListPage';
import type { PageName } from './PageName';
import type { ImagesPageProps } from '../ContentLibrary/LibraryBody/pages/ImagesPage';

export type PagePropsMap<P extends PageName> = {
  landingPage: {};
  codeList: CodeListPageProps;
  images: ImagesPageProps;
}[P];

type GlobalPageConfig<T> = {
  props: T;
};

type AllPagesConfig = {
  [K in PageName]: GlobalPageConfig<PagePropsMap<K>>;
};

export type PagesConfig = Partial<AllPagesConfig>;

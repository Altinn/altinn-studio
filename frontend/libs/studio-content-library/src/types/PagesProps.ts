import type { CodeListProps } from '../ContentLibrary/pages/CodeList';
import type { PageName } from './PageName';
import type { ImagesProps } from '../ContentLibrary/pages/Images';

export type PagePropsMap = {
  landingPage?: {};
  codeList?: CodeListProps;
  images?: ImagesProps;
};

export type PageProps = CodeListProps | ImagesProps;

type GlobalPageConfig<T> = {
  props: T;
};

type AllPagesConfig = {
  [K in PageName]: GlobalPageConfig<PagePropsMap[K]>;
};

export type PagesConfig = Partial<AllPagesConfig>;

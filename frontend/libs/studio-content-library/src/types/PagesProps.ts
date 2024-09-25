import type { RootPageProps } from '../pages/Root';
import type { CodeListProps } from '../pages/CodeList';

type PagePropsMap = {
  root: RootPageProps;
  codeList: CodeListProps;
};

type GlobalPageConfig<T> = {
  props: T;
};

export type PageConfig = {
  [K in keyof PagePropsMap]: GlobalPageConfig<PagePropsMap[K]>;
};

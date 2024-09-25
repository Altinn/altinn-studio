import { RootPageProps } from '../pages/Root';
import { CodeListProps } from '../pages/CodeList';

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

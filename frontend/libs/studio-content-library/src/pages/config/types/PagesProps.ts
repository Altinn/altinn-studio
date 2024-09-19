import { RootPageProps } from '../../Root/types';
import { CodeListProps } from '../../CodeList';

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

import type { IFooterLayout } from 'src/features/footer/types';

export interface IFooterLayoutState {
  footerLayout: IFooterLayout | null;
  error: Error | null;
}

export interface IFetchFooterLayoutFulfilled {
  footerLayout: IFooterLayout | null;
}

export interface IFooterLayoutActionRejected {
  error: Error | null;
}

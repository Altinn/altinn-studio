import type { ReactNode } from 'react';

export type StudioButtonTabType<TabId extends string> = {
  icon: ReactNode;
  tabName: string;
  tabId: TabId;
};

export type StudioLinkTabType<TabId extends string> = StudioButtonTabType<TabId> & {
  to: string;
};

export type StudioMenuTabType<TabId extends string> =
  | StudioButtonTabType<TabId>
  | StudioLinkTabType<TabId>;

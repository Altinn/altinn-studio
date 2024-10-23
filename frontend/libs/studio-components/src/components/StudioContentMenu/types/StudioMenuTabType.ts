import type { ReactNode } from 'react';

export type StudioMenuTabAsButtonType<TabId extends string> = {
  icon: ReactNode;
  tabName: string;
  tabId: TabId;
};

export type StudioMenuTabAsLinkType<TabId extends string> = StudioMenuTabAsButtonType<TabId> & {
  to: string;
};

export type StudioMenuTabType<TabId extends string> =
  | StudioMenuTabAsButtonType<TabId>
  | StudioMenuTabAsLinkType<TabId>;
